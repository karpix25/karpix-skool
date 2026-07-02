import pytest
from pydantic import ValidationError

from app.config import Settings, _database_url_password


def test_database_url_password_extracts_asyncpg_password():
    assert (
        _database_url_password("postgresql+asyncpg://postgres:s3cret%21@db:5432/app")
        == "s3cret!"
    )


def test_production_settings_reject_default_database_password_in_url():
    with pytest.raises(ValidationError) as exc_info:
        Settings(
            DATABASE_URL="postgresql+asyncpg://postgres:postgres@db:5432/app",
            SECRET_KEY="x" * 32,
            BOT_TOKEN="123456:test-token",
            ENVIRONMENT="production",
        )

    assert "DB_PASSWORD must not use a default value" in str(exc_info.value)
