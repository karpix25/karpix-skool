import hashlib
import hmac
import time
from urllib.parse import urlencode

import pytest

from app.services.webapp import telegram_init_data
from app.services.webapp.telegram_init_data import MOCK_STUDENT_INIT_DATA, require_valid_init_data, validate_telegram_data


BOT_TOKEN = "123456:test-token"


def signed_init_data(fields, bot_token=BOT_TOKEN):
    data_check_string = "\n".join(f"{key}={value}" for key, value in sorted(fields.items()))
    secret_key = hmac.new(b"WebAppData", bot_token.encode(), hashlib.sha256).digest()
    signature = hmac.new(secret_key, data_check_string.encode(), hashlib.sha256).hexdigest()

    return urlencode({**fields, "hash": signature})


def test_validate_telegram_data_accepts_valid_signed_payload():
    init_data = signed_init_data(
        {
            "auth_date": str(int(time.time())),
            "query_id": "AAHdF6IQAAAAAN0XohDhrOrc",
            "user": '{"id":1,"first_name":"Ada"}',
        }
    )

    assert validate_telegram_data(init_data, BOT_TOKEN) is True


def test_validate_telegram_data_rejects_tampered_payload():
    init_data = signed_init_data(
        {
            "auth_date": str(int(time.time())),
            "query_id": "AAHdF6IQAAAAAN0XohDhrOrc",
            "user": '{"id":1,"first_name":"Ada"}',
        }
    )

    assert validate_telegram_data(init_data.replace("Ada", "Eve"), BOT_TOKEN) is False


def test_validate_telegram_data_rejects_expired_auth_date():
    init_data = signed_init_data(
        {
            "auth_date": str(int(time.time()) - 86401),
            "query_id": "AAHdF6IQAAAAAN0XohDhrOrc",
            "user": '{"id":1,"first_name":"Ada"}',
        }
    )

    assert validate_telegram_data(init_data, BOT_TOKEN) is False


def test_validate_telegram_data_rejects_missing_hash():
    assert validate_telegram_data("auth_date=123&user=%7B%7D", BOT_TOKEN) is False


def test_mock_student_bypass_is_development_only():
    original_environment = telegram_init_data.settings.ENVIRONMENT
    original_enable_dev_auth = telegram_init_data.settings.ENABLE_DEV_AUTH
    try:
        telegram_init_data.settings.ENVIRONMENT = "production"
        telegram_init_data.settings.ENABLE_DEV_AUTH = True
        with pytest.raises(Exception):
            require_valid_init_data(MOCK_STUDENT_INIT_DATA, BOT_TOKEN)

        telegram_init_data.settings.ENVIRONMENT = "development"
        telegram_init_data.settings.ENABLE_DEV_AUTH = False
        with pytest.raises(Exception):
            require_valid_init_data(MOCK_STUDENT_INIT_DATA, BOT_TOKEN)

        telegram_init_data.settings.ENABLE_DEV_AUTH = True
        require_valid_init_data(MOCK_STUDENT_INIT_DATA, BOT_TOKEN)
    finally:
        telegram_init_data.settings.ENVIRONMENT = original_environment
        telegram_init_data.settings.ENABLE_DEV_AUTH = original_enable_dev_auth
