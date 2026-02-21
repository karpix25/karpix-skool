from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    DATABASE_URL: str
    SECRET_KEY: str # Mandatory in PRODUCTION
    DB_PASSWORD: Optional[str] = None # For scaling flexible setup
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 4320 # 3 days
    REDIS_URL: str = "redis://redis:6379/0"
    BOT_TOKEN: str = "change_me"
    BOT_USERNAME: Optional[str] = None # @MyBot
    APP_SHORT_NAME: str = "app" # t.me/bot/APP_SHORT_NAME
    FRONTEND_URL: str = "https://webapp.karpix.com"
    ENVIRONMENT: str = "development"
    SUPER_ADMIN_ID: Optional[int] = None
    
    # R2 Storage Settings
    R2_ACCOUNT_ID: str
    R2_ACCESS_KEY_ID: str
    R2_SECRET_ACCESS_KEY: str
    R2_BUCKET_NAME: str
    R2_PUBLIC_URL: str
    
    # AI Settings
    GOOGLE_API_KEY: Optional[str] = None

    # Mux Settings
    MUX_TOKEN_ID: Optional[str] = None
    MUX_TOKEN_SECRET: Optional[str] = None

    # Monitoring & Cache
    SENTRY_DSN: Optional[str] = None
    ENABLE_CACHE: bool = True

    class Config:
        env_file = ".env"

settings = Settings()

# Forced build trigger: 2026-02-06
