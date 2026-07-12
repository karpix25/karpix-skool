from typing import Any
from urllib.parse import urlsplit, urlunsplit


ALLOWED_WELCOME_VIDEO_SCHEMES = {"http", "https"}
MAX_WELCOME_VIDEO_URL_LENGTH = 2048


class UnsafeWelcomeVideoUrl(ValueError):
    pass


def normalize_welcome_video_url(value: str | None) -> str | None:
    if value is None:
        return None

    video_url = value.strip()
    if not video_url:
        return None
    if len(video_url) > MAX_WELCOME_VIDEO_URL_LENGTH:
        raise UnsafeWelcomeVideoUrl("Welcome video URL is too long")
    if any(char.isspace() or ord(char) < 32 or ord(char) == 127 for char in video_url):
        raise UnsafeWelcomeVideoUrl("Welcome video URL contains unsafe characters")

    try:
        parsed = urlsplit(video_url)
        hostname = parsed.hostname
    except ValueError as exc:
        raise UnsafeWelcomeVideoUrl("Welcome video URL is invalid") from exc

    scheme = parsed.scheme.lower()
    if scheme not in ALLOWED_WELCOME_VIDEO_SCHEMES:
        raise UnsafeWelcomeVideoUrl("Welcome video URL scheme is not allowed")
    if parsed.username or parsed.password:
        raise UnsafeWelcomeVideoUrl("Welcome video URL must not include userinfo")
    if not hostname:
        raise UnsafeWelcomeVideoUrl("Welcome video URL host is required")

    netloc = _normalize_netloc(parsed, hostname)
    return urlunsplit((scheme, netloc, parsed.path, parsed.query, parsed.fragment))


def safe_welcome_video_url_for_response(value: str | None) -> str | None:
    try:
        return normalize_welcome_video_url(value)
    except UnsafeWelcomeVideoUrl:
        return None


def tenant_welcome_video_fields(tenant: Any) -> dict[str, Any]:
    return {
        "welcome_video_enabled": bool(getattr(tenant, "welcome_video_enabled", False)),
        "welcome_video_url": safe_welcome_video_url_for_response(getattr(tenant, "welcome_video_url", None)),
        "welcome_video_title": getattr(tenant, "welcome_video_title", None),
        "welcome_video_description": getattr(tenant, "welcome_video_description", None),
    }


def _normalize_netloc(parsed, hostname: str) -> str:
    try:
        port = parsed.port
    except ValueError as exc:
        raise UnsafeWelcomeVideoUrl("Welcome video URL port is invalid") from exc

    host = hostname.lower()
    if ":" in host and not host.startswith("["):
        host = f"[{host}]"
    if port is not None:
        return f"{host}:{port}"
    return host
