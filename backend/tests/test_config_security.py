import pytest
from pydantic import ValidationError

from app.config import Settings, _database_url_password
from app.services.cors_origins import build_cors_allow_origins


def test_database_url_password_extracts_asyncpg_password():
    assert (
        _database_url_password("postgresql+asyncpg://postgres:s3cret%21@db:5432/app")
        == "s3cret!"
    )


def test_production_settings_reject_default_database_password_in_url():
    with pytest.raises(ValidationError) as exc_info:
        Settings(
            DATABASE_URL="postgresql+asyncpg://app:password@db:5432/app",
            SECRET_KEY="x" * 32,
            BOT_TOKEN="123456:test-token",
            ENVIRONMENT="production",
        )

    assert "DB_PASSWORD must not use a default value" in str(exc_info.value)


def test_dev_auth_is_disabled_by_default_even_in_development():
    settings = Settings(
        DATABASE_URL="postgresql+asyncpg://postgres:safe-password@db:5432/app",
        SECRET_KEY="test-secret",
        ENVIRONMENT="development",
    )

    assert settings.dev_auth_enabled() is False


def test_dev_auth_requires_development_environment():
    settings = Settings(
        DATABASE_URL="postgresql+asyncpg://postgres:safe-password@db:5432/app",
        SECRET_KEY="test-secret",
        ENVIRONMENT="staging",
        ENABLE_DEV_AUTH=True,
    )

    assert settings.dev_auth_enabled() is False


def test_cors_origins_include_defaults_and_env_values():
    settings = Settings(
        DATABASE_URL="postgresql+asyncpg://postgres:safe-password@db:5432/app",
        SECRET_KEY="test-secret",
        FRONTEND_URL="https://front.example/app",
        WEBAPP_URL="https://mini.example/path",
        CORS_ALLOWED_ORIGINS="https://admin.example, http://localhost:3000/",
    )

    origins = build_cors_allow_origins(settings)

    assert "http://localhost:5173" in origins
    assert "https://webapp.karpix.com" in origins
    assert "https://front.example" in origins
    assert "https://mini.example" in origins
    assert "https://admin.example" in origins
    assert "http://localhost:3000" in origins
