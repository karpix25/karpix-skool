import hashlib
import hmac
import secrets
from datetime import datetime, timedelta
from typing import Optional
from sqlalchemy import update
from sqlmodel.ext.asyncio.session import AsyncSession
from app.models import OneTimeToken, User
from app.config import settings


def hash_desktop_auth_token(token: str) -> str:
    return hmac.new(
        settings.SECRET_KEY.encode(),
        token.encode(),
        hashlib.sha256,
    ).hexdigest()


async def create_desktop_auth_token(db: AsyncSession, user: User) -> tuple[str, str]:
    """
    Generates a unique one-time token for desktop login and sends it via Telegram.
    """
    # 1. Generate secure token
    token = secrets.token_urlsafe(32)
    expires_at = datetime.utcnow() + timedelta(minutes=5)
    
    # 2. Save to DB
    new_token = OneTimeToken(
        user_id=user.id,
        token_hash=hash_desktop_auth_token(token),
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
    
    return token, login_url

async def verify_desktop_auth_token(db: AsyncSession, token: str) -> Optional[User]:
    """
    Verifies the one-time token and returns the User if valid.
    Marks token as used atomically.
    """
    now = datetime.utcnow()
    result = await db.execute(
        update(OneTimeToken)
        .where(
            OneTimeToken.token_hash == hash_desktop_auth_token(token),
            OneTimeToken.used_at == None,
            OneTimeToken.expires_at > now,
        )
        .values(used_at=now)
        .returning(OneTimeToken.user_id)
    )
    user_id = result.scalar_one_or_none()

    if not user_id:
        return None

    await db.commit()
    return await db.get(User, user_id)
