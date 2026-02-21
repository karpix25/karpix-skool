import uuid
import secrets
from datetime import datetime, timedelta
from typing import Optional
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession
from app.models import OneTimeToken, User
from app.config import settings
from app.services.telegram import send_telegram_notification

async def create_desktop_auth_token(db: AsyncSession, user: User) -> str:
    """
    Generates a unique one-time token for desktop login and sends it via Telegram.
    """
    # 1. Generate secure token
    token = secrets.token_urlsafe(32)
    expires_at = datetime.utcnow() + timedelta(minutes=5)
    
    # 2. Save to DB
    new_token = OneTimeToken(
        user_id=user.id,
        token=token,
        expires_at=expires_at
    )
    db.add(new_token)
    await db.commit()
    
    # 3. Format link
    # We should probably have a FE_URL in settings. 
    # For now, let's assume it's where the app is hosted.
    # In many setups, the TWA is on a subdomain or same domain.
    base_url = settings.FRONTEND_URL if hasattr(settings, "FRONTEND_URL") else "https://webapp.karpix.com"
    login_url = f"{base_url}/auth/desktop?token={token}"
    
    # 4. Send Telegram message
    message = (
        "🔗 **Вход в личный кабинет на компьютере**\n\n"
        "Вы запросили ссылку для входа в систему с компьютера.\n"
        f"Эта ссылка действует 5 минут и может быть использована только один раз.\n\n"
        f"[Нажмите здесь, чтобы войти]({login_url})"
    )
    
    await send_telegram_notification(user.telegram_id, message)
    
    return token, login_url

async def verify_desktop_auth_token(db: AsyncSession, token: str) -> Optional[User]:
    """
    Verifies the one-time token and returns the User if valid.
    Marks token as used.
    """
    stmt = select(OneTimeToken).where(
        OneTimeToken.token == token,
        OneTimeToken.used_at == None,
        OneTimeToken.expires_at > datetime.utcnow()
    )
    result = await db.execute(stmt)
    ott = result.scalars().first()
    
    if not ott:
        return None
        
    # Mark as used
    ott.used_at = datetime.utcnow()
    db.add(ott)
    await db.commit()
    
    # Return user
    stmt_u = select(User).where(User.id == ott.user_id)
    res_u = await db.execute(stmt_u)
    return res_u.scalars().first()
