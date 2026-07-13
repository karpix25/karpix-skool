from datetime import datetime, timedelta
from typing import Optional, Any, Union, Dict
import jwt
from passlib.context import CryptContext
from .config import settings
import hashlib
import hmac
import json
import time

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
TELEGRAM_AUTH_MAX_AGE_SECONDS = 86400
TELEGRAM_AUTH_FUTURE_SKEW_SECONDS = 60

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def create_access_token(subject: Union[str, Any], extra_data: Optional[Dict[str, Any]] = None, expires_delta: Optional[timedelta] = None) -> str:
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode = {"exp": expire, "sub": str(subject)}
    if extra_data:
        to_encode.update(extra_data)
        
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def validate_telegram_auth(
    data: Dict[str, str],
    bot_token: str,
    max_age_seconds: int = TELEGRAM_AUTH_MAX_AGE_SECONDS,
) -> bool:
    """
    Validates the hash received from Telegram Login Widget.
    Algorithm: HMAC-SHA256
    """
    if "hash" not in data:
        return False

    if not _is_fresh_telegram_auth_date(data.get("auth_date"), max_age_seconds):
        return False
    
    received_hash = data["hash"]
    
    # 1. Create Data Check String
    # Sort alphabetically by key, format key=value, join with \n.
    # Exclude 'hash' itself.
    data_check_arr = []
    for k, v in sorted(data.items()):
        if k != "hash":
            data_check_arr.append(f"{k}={v}")
    
    data_check_string = "\n".join(data_check_arr)
    
    # 2. Create Secret Key
    # SHA256 of the bot token string literal
    secret_key = hashlib.sha256(bot_token.encode()).digest()
    
    # 3. Calculate HMAC
    calculated_hash = hmac.new(
        secret_key, 
        data_check_string.encode(), 
        hashlib.sha256
    ).hexdigest()
    
    # 4. Compare
    return hmac.compare_digest(calculated_hash, received_hash)


def _is_fresh_telegram_auth_date(auth_date_raw: Optional[str], max_age_seconds: int) -> bool:
    try:
        auth_date = int(auth_date_raw or "0")
    except (TypeError, ValueError):
        return False

    age_seconds = int(time.time()) - auth_date
    if age_seconds < -TELEGRAM_AUTH_FUTURE_SKEW_SECONDS:
        return False
    return age_seconds <= max_age_seconds
