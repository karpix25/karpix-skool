import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlmodel import select
from ..db import get_session
from ..models import User
from ..auth import get_password_hash, verify_password, create_access_token
from pydantic import BaseModel, EmailStr
from typing import Optional
from ..utils.logging_config import auth_logger as logger

router = APIRouter()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

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
async def register(user_in: UserRegister, session: AsyncSession = Depends(get_session)):
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
    return {"access_token": access_token, "token_type": "bearer", "is_super_admin": new_user.is_super_admin}

@router.post("/login", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends(), session: AsyncSession = Depends(get_session)):
    # Authenticate
    stmt = select(User).where(User.email == form_data.username)
    result = await session.exec(stmt)
    user = result.first()
    
    if not user or not user.password_hash or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(status_code=400, detail="Incorrect email or password")
    
    access_token = create_access_token(subject=str(user.id))
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
    # IMPORTANT: We need BOT_TOKEN in settings. 
    # It is in .env but maybe not in Settings model yet. I will check config.py in next step.
    # Assuming settings.BOT_TOKEN exists or os.getenv.
    import os
    bot_token = os.getenv("BOT_TOKEN") 
    if not bot_token:
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
    logger.info(f"AUTH LOGIN: id={login_data.id}, target={target_id}, match={is_sa_match}")

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
    return {"access_token": access_token, "token_type": "bearer", "is_super_admin": user.is_super_admin}

# Dev Login for Localhost (Bypass Widget)
class DevLoginData(BaseModel):
    id: int
    username: str

@router.post("/dev-login", response_model=Token)
async def dev_login(
    login_data: DevLoginData, 
    session: AsyncSession = Depends(get_session)
):
    if settings.ENVIRONMENT != "development":
        raise HTTPException(status_code=403, detail="Development login is disabled in production")
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
        logger.info("Token generated successfully")
        return {"access_token": access_token, "token_type": "bearer", "is_super_admin": user.is_super_admin}
    except Exception as e:
        logger.error(f"Token generation failed: {e}")
        raise e

async def get_current_user(token: str = Depends(oauth2_scheme), session: AsyncSession = Depends(get_session)) -> User:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
             logger.warning(f"AUTH: No 'sub' in payload. Token: {token[:20]}...")
             raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError as e:
        logger.error(f"AUTH: JWT Error: {e}. Token: {token[:20]}... Key: {settings.SECRET_KEY[:5]}...")
        raise HTTPException(status_code=401, detail="Invalid token")
    
    user = await session.get(User, user_id)
    if not user:
        logger.warning(f"AUTH: User {user_id} not found in DB")
        raise HTTPException(status_code=401, detail="User not found")
    
    if user.is_blocked:
        raise HTTPException(status_code=403, detail="Your account has been blocked.")
        
    return user


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
    
    if current_user.admin_status != UserAdminStatus.none:
        return {"message": "Request already submitted or user is already admin", "status": current_user.admin_status}
    
    current_user.admin_status = UserAdminStatus.pending
    current_user.admin_request_details = {
        "school_name": req.school_name,
        "details": req.details
    }
    
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
            msg = (
                f"🔔 **Новая заявка на доступ!**\n\n"
                f"👤 Юзер: @{current_user.username or 'unknown'} (ID: {current_user.telegram_id})\n"
                f"🏫 Школа: {req.school_name}\n"
                f"📝 Инфо: {req.details}\n"
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
                        "parse_mode": "Markdown",
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
