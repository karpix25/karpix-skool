from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional
from urllib.parse import unquote, urlparse


def _database_url_password(database_url: str) -> Optional[str]:
    try:
        parsed = urlparse(database_url)
    except Exception:
        return None
    return unquote(parsed.password) if parsed.password else None

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env")

    DATABASE_URL: str
    SECRET_KEY: str # Mandatory in PRODUCTION
    DB_PASSWORD: Optional[str] = None # For scaling flexible setup
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 4320 # 3 days
    REDIS_URL: str = "redis://redis:6379/0"
    TRUSTED_PROXY_CIDRS: str = "127.0.0.1/32,::1/128"
    BOT_TOKEN: str = "change_me"
    BOT_USERNAME: Optional[str] = None # @MyBot
    APP_SHORT_NAME: str = "app" # t.me/bot/APP_SHORT_NAME
    FRONTEND_URL: str = "https://webapp.karpix.com"
    BACKEND_PUBLIC_URL: Optional[str] = None
    WEBAPP_URL: Optional[str] = None
    CORS_ALLOWED_ORIGINS: str = ""
    ENVIRONMENT: str = "development"
    ENABLE_DEV_AUTH: bool = False
    SUPER_ADMIN_ID: Optional[int] = None
    
    # R2 Storage Settings
    R2_ACCOUNT_ID: Optional[str] = None
    R2_ACCESS_KEY_ID: Optional[str] = None
    R2_SECRET_ACCESS_KEY: Optional[str] = None
    R2_BUCKET_NAME: Optional[str] = None
    R2_PUBLIC_URL: Optional[str] = None
    
    # AI Settings
    GOOGLE_API_KEY: Optional[str] = None
    OPEN_NOTEBOOK_API_URL: Optional[str] = "http://open_notebook:5055/api"
    OPEN_NOTEBOOK_PASSWORD: Optional[str] = None
    OPEN_NOTEBOOK_ANSWER_TIMEOUT_SECONDS: int = 900
    OPEN_NOTEBOOK_SOURCE_POLL_SECONDS: float = 2.0
    OPEN_NOTEBOOK_SOURCE_POLL_ATTEMPTS: int = 150
    OPEN_NOTEBOOK_EMBED_SOURCES: bool = False
    OPEN_NOTEBOOK_TRANSFORMATION_MODEL_ID: Optional[str] = None
    LESSON_GENERATION_POLL_SECONDS: int = 5
    SCRAPE_CREATORS_API_KEY: Optional[str] = None
    SCRAPE_CREATORS_BASE_URL: str = "https://api.scrapecreators.com"
    SCRAPE_CREATORS_TRANSCRIPT_LANGUAGE: Optional[str] = None
    SCRAPE_CREATORS_TIKTOK_AI_FALLBACK: bool = False

    # Mux Settings
    MUX_TOKEN_ID: Optional[str] = None
    MUX_TOKEN_SECRET: Optional[str] = None
    MUX_WEBHOOK_SECRET: Optional[str] = None

    # Payment Settings
    PAYMENT_WEBHOOK_SECRET: Optional[str] = None

    # Monitoring & Cache
    SENTRY_DSN: Optional[str] = None
    ENABLE_CACHE: bool = True

    @model_validator(mode="after")
    def validate_production_secrets(self):
        if self.ENVIRONMENT != "production":
            return self

        weak_values = {"", "change_me", "changeme", "password", "postgres", "secret", "test-secret"}
        if self.BOT_TOKEN in weak_values:
            raise ValueError("BOT_TOKEN must be configured for production")
        if self.SECRET_KEY in weak_values or len(self.SECRET_KEY) < 32:
            raise ValueError("SECRET_KEY must be at least 32 characters in production")
        db_password = self.DB_PASSWORD or _database_url_password(self.DATABASE_URL)
        if db_password in weak_values:
            raise ValueError("DB_PASSWORD must not use a default value in production")
        return self

    def dev_auth_enabled(self) -> bool:
        return self.ENABLE_DEV_AUTH and self.ENVIRONMENT == "development"

settings = Settings()

# Forced build trigger: 2026-02-06
