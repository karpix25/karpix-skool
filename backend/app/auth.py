from datetime import datetime, timedelta
from typing import Optional, Any, Union, Dict
from jose import JWTError, jwt
from passlib.context import CryptContext
from .config import settings
import hashlib
import hmac
import json

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

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

def validate_telegram_auth(data: Dict[str, str], bot_token: str) -> bool:
    """
    Validates the hash received from Telegram Login Widget.
    Algorithm: HMAC-SHA256
    """
    if "hash" not in data:
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
    return calculated_hash == received_hash
