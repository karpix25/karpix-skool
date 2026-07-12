import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlmodel import select
from ..db import get_session
from ..models import User
from ..auth import get_password_hash, verify_password, create_access_token
from ..auth_cookies import clear_access_token_cookie, get_access_token_candidates, set_access_token_cookie
from pydantic import BaseModel, EmailStr
from typing import Optional
from ..utils.logging_config import auth_logger as logger
from ..services import auth_service
from ..services.telegram_messages import TELEGRAM_MARKDOWN_V2, build_admin_request_notification_message

router = APIRouter()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login", auto_error=False)


class UserRegister(BaseModel):
    email: EmailStr
    password: str
    username: Optional[str] = None

class Token(BaseModel):
    access_token: str
    token_type: str
    is_super_admin: bool = False

class UserRead(BaseModel):
    id: uuid.UUID
    email: Optional[str] = None
    username: Optional[str] = None
    is_super_admin: bool = False
    admin_status: str = "none"

@router.post("/register", response_model=Token)
async def register(
    user_in: UserRegister,
    response: Response,
    session: AsyncSession = Depends(get_session),
):
    # Check if user exists
    stmt = select(User).where(User.email == user_in.email)
    result = await session.exec(stmt)
    if result.first():
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user
    new_user = User(
        email=user_in.email,
        password_hash=get_password_hash(user_in.password),
        username=user_in.username
    )
    session.add(new_user)
    await session.commit()
    await session.refresh(new_user)
    
    access_token = create_access_token(subject=str(new_user.id))
    set_access_token_cookie(response, access_token)
    return {"access_token": access_token, "token_type": "bearer", "is_super_admin": new_user.is_super_admin}

@router.post("/login", response_model=Token)
async def login(
    response: Response,
    form_data: OAuth2PasswordRequestForm = Depends(),
    session: AsyncSession = Depends(get_session),
):
    # Authenticate
    stmt = select(User).where(User.email == form_data.username)
    result = await session.exec(stmt)
    user = result.first()
    
    if not user or not user.password_hash or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(status_code=400, detail="Incorrect email or password")
    
    access_token = create_access_token(subject=str(user.id))
    set_access_token_cookie(response, access_token)
    return {"access_token": access_token, "token_type": "bearer", "is_super_admin": user.is_super_admin}

class TelegramLoginData(BaseModel):
    id: int
    first_name: str
    username: Optional[str] = None
    photo_url: Optional[str] = None
    auth_date: int
    hash: str

@router.post("/login/telegram", response_model=Token)
async def login_telegram(
    login_data: TelegramLoginData, 
    response: Response,
    session: AsyncSession = Depends(get_session)
):
    # 1. Validate Hash
    # Convert Pydantic model to dict, excluding None values if needed? 
    # Telegram sends exactly what it sends.
    # NOTE: Pydantic model might convert types? 'id' is int, but query param is string.
    # The widget returns JS object.
    
    # Convert data back to the dict format expected by validation
    # (Checking against string values typically, but let's be careful with int id)
    # The validation requires exact string representation as sent by Telegram.
    # Since we receive JSON, we must convert values to strings for the check string.
    
    data_dict = login_data.dict(exclude_none=True)
    # Be careful: 'id' and 'auth_date' are ints in Pydantic, but might be needed as str for hashing?
    # Actually, the standard says "key=value".
    
    check_dict = {}
    for k, v in data_dict.items():
         check_dict[k] = str(v)

    from ..config import settings
    bot_token = settings.BOT_TOKEN
    if not bot_token or bot_token == "change_me":
         raise HTTPException(status_code=500, detail="Bot configuration error")

    from ..auth import validate_telegram_auth
    is_valid = validate_telegram_auth(check_dict, bot_token)
    
    if not is_valid:
        raise HTTPException(status_code=400, detail="Invalid Telegram data")
        
    # 2. Find or Create User
    target_id = None
    try:
        if settings.SUPER_ADMIN_ID is not None:
            target_id = int(str(settings.SUPER_ADMIN_ID).strip())
    except:
        pass
        
    is_sa_match = (target_id is not None and int(login_data.id) == target_id)
    logger.info("AUTH LOGIN: accepted Telegram login; super_admin_match=%s", is_sa_match)

    stmt = select(User).where(User.telegram_id == login_data.id)
    result = await session.exec(stmt)
    user = result.first()
    
    if not user:
        user = User(
            telegram_id=login_data.id,
            username=login_data.username,
            avatar_url=login_data.photo_url,
            email=None,
            is_super_admin=is_sa_match
        )
        session.add(user)
        await session.commit()
        await session.refresh(user)
    elif is_sa_match and not user.is_super_admin:
        user.is_super_admin = True
        # Update info for existing admin
        if login_data.photo_url:
            user.avatar_url = login_data.photo_url
        if login_data.username:
            user.username = login_data.username
        session.add(user)
        await session.commit()
        await session.refresh(user)
    else:
        # Update info for existing user
        changed = False
        if login_data.photo_url and user.avatar_url != login_data.photo_url:
            user.avatar_url = login_data.photo_url
            changed = True
        if login_data.username and user.username != login_data.username:
            user.username = login_data.username
            changed = True
        
        if changed:
            session.add(user)
            await session.commit()
            await session.refresh(user)
    
    # 3. Generate Token
    access_token = create_access_token(subject=str(user.id))
    set_access_token_cookie(response, access_token)
    return {"access_token": access_token, "token_type": "bearer", "is_super_admin": user.is_super_admin}

# Dev Login for Localhost (Bypass Widget)
class DevLoginData(BaseModel):
    id: int
    username: str

@router.post("/dev-login", response_model=Token)
async def dev_login(
    login_data: DevLoginData, 
    response: Response,
    session: AsyncSession = Depends(get_session)
):
    if not settings.dev_auth_enabled():
        raise HTTPException(status_code=403, detail="Development login is disabled")
    import logging
    logger = logging.getLogger("API")
    logger.info(f"DEV LOGIN ATTEMPT: {login_data}")
    
    # Create or Get User (Simulating Auth)
    stmt = select(User).where(User.telegram_id == login_data.id)
    result = await session.exec(stmt)
    user = result.first()
    
    if not user:
        logger.info("Creating new Dev User...")
        user = User(
            telegram_id=login_data.id,
            username=login_data.username,
            avatar_url=None,
            email=None,
            is_super_admin=(settings.SUPER_ADMIN_ID is not None and login_data.id == settings.SUPER_ADMIN_ID)
        )
        session.add(user)
        try:
            await session.commit()
            await session.refresh(user)
            logger.info(f"Dev User Created: {user.id}")
        except Exception as e:
            logger.error(f"DB Error creation: {e}")
            raise e
    elif settings.SUPER_ADMIN_ID is not None and login_data.id == settings.SUPER_ADMIN_ID and not user.is_super_admin:
        user.is_super_admin = True
        session.add(user)
        await session.commit()
        await session.refresh(user)
        logger.info(f"Dev User {user.id} promoted to Super Admin")
    else:
        logger.info(f"Found existing Dev User: {user.id}")
    
    try:
        access_token = create_access_token(subject=str(user.id))
        set_access_token_cookie(response, access_token)
        logger.info("Token generated successfully")
        return {"access_token": access_token, "token_type": "bearer", "is_super_admin": user.is_super_admin}
    except Exception as e:
        logger.error(f"Token generation failed: {e}")
        raise e

async def get_current_user(
    request: Request,
    token: Optional[str] = Depends(oauth2_scheme),
    session: AsyncSession = Depends(get_session),
) -> User:
    candidates = get_access_token_candidates(request, token)
    if not candidates:
        raise HTTPException(status_code=401, detail="Not authenticated")

    for access_token in candidates:
        try:
            payload = jwt.decode(access_token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
            user_id = payload.get("sub")
            if user_id is None:
                logger.warning("AUTH: No 'sub' in JWT payload")
                continue
        except JWTError as e:
            logger.error(f"AUTH: JWT Error: {type(e).__name__}")
            continue

        user = await session.get(User, user_id)
        if not user:
            logger.warning(f"AUTH: User {user_id} not found in DB")
            continue

        if user.is_blocked:
            raise HTTPException(status_code=403, detail="Your account has been blocked.")

        return user

    raise HTTPException(status_code=401, detail="Invalid token")


@router.get("/me", response_model=UserRead)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user

class AdminRequest(BaseModel):
    school_name: Optional[str] = None
    details: Optional[str] = None

@router.post("/request-admin")
async def request_admin(
    req: AdminRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    from ..models import UserAdminStatus
    from ..services.super_activity import record_super_activity
    
    if current_user.admin_status != UserAdminStatus.none:
        return {"message": "Request already submitted or user is already admin", "status": current_user.admin_status}

    requested_at = datetime.utcnow()
    current_user.admin_status = UserAdminStatus.pending
    current_user.admin_request_details = {
        "school_name": req.school_name,
        "details": req.details,
        "requested_at": requested_at.isoformat()
    }
    current_user.updated_at = requested_at
    await record_super_activity(
        session,
        event_type="author.requested",
        title="Новая заявка автора",
        message=f"{current_user.username or current_user.telegram_id or current_user.id} запросил доступ к своей школе.",
        tone="warning",
        actor_user_id=current_user.id,
        target_type="user",
        target_id=str(current_user.id),
        meta={"school_name": req.school_name},
        dedupe_key=f"author.requested:{current_user.id}:{requested_at.isoformat()}",
        occurred_at=requested_at,
    )
    
    session.add(current_user)
    await session.commit()
    
    # Notify Super Admin via Telegram
    try:
        bot_token = settings.BOT_TOKEN
        super_admin_id = settings.SUPER_ADMIN_ID
        
        if not bot_token or bot_token == "change_me":
            logger.warning("Notification skipped: BOT_TOKEN is not configured")
        elif not super_admin_id:
            logger.warning("Notification skipped: SUPER_ADMIN_ID is not configured")
        else:
            logger.info(f"Attempting to notify Super Admin {super_admin_id} about new request from {current_user.id}")
            msg = build_admin_request_notification_message(
                current_user.username,
                current_user.telegram_id,
                req.school_name,
                req.details,
            )
            
            # Inline buttons for Approval
            # Callback data: approve_admin:<user_id>
            reply_markup = {
                "inline_keyboard": [
                    [
                        {"text": "✅ Одобрить", "callback_data": f"approve_admin:{current_user.id}"},
                        {"text": "❌ Отклонить", "callback_data": f"reject_admin:{current_user.id}"}
                    ]
                ]
            }
            
            import httpx
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"https://api.telegram.org/bot{bot_token}/sendMessage",
                    json={
                        "chat_id": super_admin_id,
                        "text": msg,
                        "parse_mode": TELEGRAM_MARKDOWN_V2,
                        "reply_markup": reply_markup
                    }
                )
                if response.status_code == 200:
                    logger.info(f"Successfully notified Super Admin about request from {current_user.id}")
                else:
                    logger.error(f"Telegram API error ({response.status_code}): {response.text}")
    except Exception as e:
        logger.error(f"FAILED TO NOTIFY SUPER ADMIN: {e}")

    return {"message": "Request submitted", "status": "pending"}


@router.post("/logout")
async def logout(response: Response):
    clear_access_token_cookie(response)
    return {"message": "Logged out"}

async def get_super_user(current_user: User = Depends(get_current_user)) -> User:
    """
    Dependency to verify the current user is a super admin.
    Raises 403 if user is not a super admin.
    """
    if not current_user.is_super_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    return current_user

# Import at top
from jose import JWTError, jwt
from ..config import settings

class DesktopTokenResponse(BaseModel):
    message: str
    login_url: str

@router.post("/request-desktop-login", response_model=DesktopTokenResponse)
async def request_desktop_login(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """
    Called from Mini App. SENDS a message to the user via Telegram with a magic link.
    Returns the URL as well for immediate opening.
    """
    token, login_url = await auth_service.create_desktop_auth_token(session, current_user)
    return {
        "message": "Login link sent to your Telegram",
        "login_url": login_url
    }

class VerifyDesktopToken(BaseModel):
    token: str

@router.post("/verify-desktop-token", response_model=Token)
async def verify_desktop_token(
    data: VerifyDesktopToken,
    response: Response,
    session: AsyncSession = Depends(get_session)
):
    """
    Called from Desktop Browser. Validates the token and returns a JWT.
    """
    user = await auth_service.verify_desktop_auth_token(session, data.token)
    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired token")
        
    access_token = create_access_token(subject=str(user.id))
    set_access_token_cookie(response, access_token)
    return {"access_token": access_token, "token_type": "bearer", "is_super_admin": user.is_super_admin}
