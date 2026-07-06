from urllib.parse import urlsplit, urlunsplit

from app.config import Settings


DEFAULT_CORS_ORIGINS = (
    "http://localhost:5173",
    "https://web.telegram.org",
    "https://t.me",
    "https://webapp.karpix.com",
    "https://zadnik.karpix.com",
)


def normalize_origin(value: str | None) -> str | None:
    if not value:
        return None

    raw = value.strip()
    if not raw:
        return None

    parsed = urlsplit(raw)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        return None

    return urlunsplit((parsed.scheme.lower(), parsed.netloc.lower(), "", "", ""))


def parse_origin_list(value: str | None) -> list[str]:
    if not value:
        return []
    return [origin for item in value.split(",") if (origin := normalize_origin(item))]


def build_cors_allow_origins(settings: Settings) -> list[str]:
    origins = list(DEFAULT_CORS_ORIGINS)
    origins.extend(
        origin
        for origin in (
            normalize_origin(settings.FRONTEND_URL),
            normalize_origin(settings.WEBAPP_URL),
        )
        if origin
    )
    origins.extend(parse_origin_list(settings.CORS_ALLOWED_ORIGINS))
    return list(dict.fromkeys(origins))
