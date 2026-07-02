import secrets


SETUP_CODE_PREFIX = "START"
SETUP_CODE_RANDOM_BYTES = 24


def generate_setup_code() -> str:
    token = secrets.token_urlsafe(SETUP_CODE_RANDOM_BYTES)
    return f"{SETUP_CODE_PREFIX}-{token}"
