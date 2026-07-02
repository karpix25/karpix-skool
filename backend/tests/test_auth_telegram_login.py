import hashlib
import hmac
import time

import pytest
from fastapi import HTTPException

from app import auth
from app.routes import auth as auth_routes


BOT_TOKEN = "123456:test-token"


def signed_login_data(fields, bot_token=BOT_TOKEN):
    data_check_string = "\n".join(f"{key}={value}" for key, value in sorted(fields.items()))
    secret_key = hashlib.sha256(bot_token.encode()).digest()
    signature = hmac.new(secret_key, data_check_string.encode(), hashlib.sha256).hexdigest()
    return {**fields, "hash": signature}


def test_validate_telegram_auth_accepts_fresh_signed_payload():
    data = signed_login_data(
        {
            "auth_date": str(int(time.time())),
            "first_name": "Ada",
            "id": "123",
            "username": "ada",
        }
    )

    assert auth.validate_telegram_auth(data, BOT_TOKEN) is True


def test_validate_telegram_auth_rejects_expired_signed_payload():
    data = signed_login_data(
        {
            "auth_date": str(int(time.time()) - auth.TELEGRAM_AUTH_MAX_AGE_SECONDS - 1),
            "first_name": "Ada",
            "id": "123",
        }
    )

    assert auth.validate_telegram_auth(data, BOT_TOKEN) is False


def test_validate_telegram_auth_rejects_missing_auth_date():
    data = signed_login_data(
        {
            "first_name": "Ada",
            "id": "123",
        }
    )

    assert auth.validate_telegram_auth(data, BOT_TOKEN) is False


def test_validate_telegram_auth_uses_constant_time_compare(monkeypatch):
    data = signed_login_data(
        {
            "auth_date": str(int(time.time())),
            "first_name": "Ada",
            "id": "123",
        }
    )
    calls = []

    def fake_compare_digest(calculated, received):
        calls.append((calculated, received))
        return True

    monkeypatch.setattr(auth.hmac, "compare_digest", fake_compare_digest)

    assert auth.validate_telegram_auth(data, BOT_TOKEN) is True
    assert calls == [(data["hash"], data["hash"])]


class NoQuerySession:
    async def exec(self, _statement):
        raise AssertionError("Expired Telegram login must be rejected before database access")


@pytest.mark.asyncio
async def test_login_telegram_route_rejects_expired_payload_before_db(monkeypatch):
    data = signed_login_data(
        {
            "auth_date": str(int(time.time()) - auth.TELEGRAM_AUTH_MAX_AGE_SECONDS - 1),
            "first_name": "Ada",
            "id": "123",
            "username": "ada",
        }
    )
    monkeypatch.setattr(auth_routes.settings, "BOT_TOKEN", BOT_TOKEN)

    with pytest.raises(HTTPException) as exc_info:
        await auth_routes.login_telegram(
            auth_routes.TelegramLoginData(**data),
            NoQuerySession(),
        )

    assert exc_info.value.status_code == 400
