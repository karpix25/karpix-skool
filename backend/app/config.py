from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REDIS_URL: str = "redis://redis:6379/0"
    BOT_TOKEN: str = "change_me"
    ENVIRONMENT: str = "development"
    
    # R2 Storage Settings
    R2_ACCOUNT_ID: str = "b5b0b964016e7d29effdc05e52c756b8"
    R2_ACCESS_KEY_ID: str = "deb820254db0fb5a58a01badbe2ab7f5"
    R2_SECRET_ACCESS_KEY: str = "3c712b669829b1e8389dabd7967164f926f2d0b34384ae76019126576680dc2c"
    R2_BUCKET_NAME: str = "karpix-skool"
    R2_PUBLIC_URL: str = "https://pub-70ba6f963fc94693a9396ec06768fbda.r2.dev"

    class Config:
        env_file = ".env"

settings = Settings()
