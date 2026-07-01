import hashlib
import hmac
import json
import time
from dataclasses import dataclass
from typing import Optional
from urllib.parse import parse_qsl

from fastapi import HTTPException

from ...config import settings
from ...utils.logging_config import logger


MAX_AUTH_AGE_SECONDS = 86400
MOCK_STUDENT_INIT_DATA = "mock_student"


@dataclass(frozen=True)
class WebAppUserData:
    telegram_id: int
    username: Optional[str]
    first_name: Optional[str]
    photo_url: Optional[str]
    start_param: Optional[str] = None


def is_mock_student(init_data: str) -> bool:
    return settings.ENVIRONMENT == "development" and init_data == MOCK_STUDENT_INIT_DATA


def get_mock_student_data() -> WebAppUserData:
    return WebAppUserData(
        telegram_id=123456789,
        username="student_dev",
        first_name="Dev Student",
        photo_url=None,
    )


def validate_telegram_data(
    init_data: str,
    bot_token: str,
    max_age_seconds: int = MAX_AUTH_AGE_SECONDS,
) -> bool:
    try:
        parsed_pairs = parse_qsl(init_data, keep_blank_values=True, strict_parsing=False)
        parsed_data = dict(parsed_pairs)
        hash_value = parsed_data.pop("hash", None)

        if not hash_value:
            logger.warning("Validation Error: No hash found")
            return False

        auth_date_raw = parsed_data.get("auth_date")
        auth_date = int(auth_date_raw or 0)
        current_time = int(time.time())
        if auth_date == 0 or current_time - auth_date > max_age_seconds:
            logger.warning("Validation Error: auth_date expired or missing")
            return False

        data_check_string = "\n".join(
            f"{key}={value}" for key, value in sorted(parsed_data.items())
        )
        secret_key = hmac.new(
            b"WebAppData",
            bot_token.encode(),
            hashlib.sha256,
        ).digest()
        calculated_hash = hmac.new(
            secret_key,
            data_check_string.encode(),
            hashlib.sha256,
        ).hexdigest()

        return hmac.compare_digest(calculated_hash, hash_value)
    except Exception as exc:
        logger.error(f"Validation Error: {exc}")
        return False


def parse_webapp_user_data(init_data: str) -> WebAppUserData:
    if is_mock_student(init_data):
        return get_mock_student_data()

    try:
        parsed = dict(parse_qsl(init_data, keep_blank_values=True, strict_parsing=False))
        user_data = json.loads(parsed.get("user", "{}"))
    except Exception as exc:
        raise HTTPException(status_code=400, detail="Bad data format") from exc

    telegram_id = user_data.get("id")
    if not telegram_id:
        raise HTTPException(status_code=400, detail="No user ID")

    return WebAppUserData(
        telegram_id=int(telegram_id),
        username=user_data.get("username"),
        first_name=user_data.get("first_name"),
        photo_url=user_data.get("photo_url"),
        start_param=parsed.get("start_param"),
    )


def require_valid_init_data(init_data: str, bot_token: str) -> None:
    if is_mock_student(init_data):
        return

    if not validate_telegram_data(init_data, bot_token):
        logger.warning("Invalid WebApp Init Data")
        raise HTTPException(status_code=401, detail="Invalid Telegram data")
