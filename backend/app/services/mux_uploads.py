from urllib.parse import urlparse

from ..config import settings


def get_mux_direct_upload_cors_origin(
    *,
    environment: str | None = None,
    frontend_url: str | None = None,
) -> str:
    env = environment if environment is not None else settings.ENVIRONMENT
    if env != "production":
        return "*"

    origin = _url_origin(frontend_url if frontend_url is not None else settings.FRONTEND_URL)
    return origin or "*"


def _url_origin(url: str | None) -> str | None:
    if not url:
        return None

    parsed = urlparse(url.strip())
    if parsed.scheme and parsed.netloc:
        return f"{parsed.scheme}://{parsed.netloc}"
    return url.strip().rstrip("/") or None
