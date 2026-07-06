import re
from urllib.parse import urlsplit, urlunsplit


ALLOWED_GROUP_LINK_SCHEMES = {"http", "https", "tg"}
MAX_GROUP_LINK_LENGTH = 2048
TELEGRAM_USERNAME_PATTERN = re.compile(r"^[A-Za-z0-9_]{5,32}$")


class UnsafeGroupLink(ValueError):
    pass


UnsafeVipGroupLink = UnsafeGroupLink


def normalize_group_link(value: str | None, *, label: str = "Group link") -> str | None:
    if value is None:
        return None

    link = value.strip()
    if not link:
        return None
    if link.startswith("@"):
        link = f"https://t.me/{link[1:]}"
    elif link.lower().startswith("t.me/"):
        link = f"https://{link}"
    elif TELEGRAM_USERNAME_PATTERN.fullmatch(link):
        link = f"https://t.me/{link}"
    if len(link) > MAX_GROUP_LINK_LENGTH:
        raise UnsafeGroupLink(f"{label} is too long")
    if any(char.isspace() or ord(char) < 32 or ord(char) == 127 for char in link):
        raise UnsafeGroupLink(f"{label} contains unsafe characters")

    parsed = urlsplit(link)
    scheme = parsed.scheme.lower()
    if scheme not in ALLOWED_GROUP_LINK_SCHEMES:
        raise UnsafeGroupLink(f"{label} scheme is not allowed")

    if scheme in {"http", "https"}:
        return _normalize_http_link(parsed, scheme, label=label)
    return _normalize_tg_link(parsed)


def normalize_free_group_link(value: str | None) -> str | None:
    return normalize_group_link(value, label="Free group link")


def normalize_vip_group_link(value: str | None) -> str | None:
    return normalize_group_link(value, label="VIP group link")


def safe_free_group_link_for_response(value: str | None) -> str | None:
    try:
        return normalize_free_group_link(value)
    except UnsafeGroupLink:
        return None


def safe_vip_group_link_for_response(value: str | None) -> str | None:
    try:
        return normalize_vip_group_link(value)
    except UnsafeGroupLink:
        return None


def public_telegram_link_from_username(username: str | None) -> str | None:
    username = username.strip().lstrip("@") if username else ""
    if not username:
        return None
    return normalize_free_group_link(f"https://t.me/{username}")


def _normalize_http_link(parsed, scheme: str, *, label: str) -> str:
    if parsed.username or parsed.password:
        raise UnsafeGroupLink(f"{label} must not include userinfo")
    if not parsed.hostname:
        raise UnsafeGroupLink(f"{label} host is required")

    netloc = parsed.hostname.lower()
    try:
        port = parsed.port
    except ValueError as exc:
        raise UnsafeGroupLink(f"{label} port is invalid") from exc
    if port is not None:
        netloc = f"{netloc}:{port}"

    return urlunsplit((scheme, netloc, parsed.path, parsed.query, parsed.fragment))


def _normalize_tg_link(parsed) -> str:
    if not parsed.netloc:
        raise UnsafeGroupLink("Telegram group link target is required")
    return urlunsplit(("tg", parsed.netloc.lower(), parsed.path, parsed.query, parsed.fragment))
