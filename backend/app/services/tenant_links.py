from urllib.parse import urlsplit, urlunsplit


ALLOWED_VIP_GROUP_LINK_SCHEMES = {"http", "https", "tg"}
MAX_VIP_GROUP_LINK_LENGTH = 2048


class UnsafeVipGroupLink(ValueError):
    pass


def normalize_vip_group_link(value: str | None) -> str | None:
    if value is None:
        return None

    link = value.strip()
    if not link:
        return None
    if len(link) > MAX_VIP_GROUP_LINK_LENGTH:
        raise UnsafeVipGroupLink("VIP group link is too long")
    if any(char.isspace() or ord(char) < 32 or ord(char) == 127 for char in link):
        raise UnsafeVipGroupLink("VIP group link contains unsafe characters")

    parsed = urlsplit(link)
    scheme = parsed.scheme.lower()
    if scheme not in ALLOWED_VIP_GROUP_LINK_SCHEMES:
        raise UnsafeVipGroupLink("VIP group link scheme is not allowed")

    if scheme in {"http", "https"}:
        return _normalize_http_link(parsed, scheme)
    return _normalize_tg_link(parsed)


def safe_vip_group_link_for_response(value: str | None) -> str | None:
    try:
        return normalize_vip_group_link(value)
    except UnsafeVipGroupLink:
        return None


def _normalize_http_link(parsed, scheme: str) -> str:
    if parsed.username or parsed.password:
        raise UnsafeVipGroupLink("VIP group link must not include userinfo")
    if not parsed.hostname:
        raise UnsafeVipGroupLink("VIP group link host is required")

    netloc = parsed.hostname.lower()
    try:
        port = parsed.port
    except ValueError as exc:
        raise UnsafeVipGroupLink("VIP group link port is invalid") from exc
    if port is not None:
        netloc = f"{netloc}:{port}"

    return urlunsplit((scheme, netloc, parsed.path, parsed.query, parsed.fragment))


def _normalize_tg_link(parsed) -> str:
    if not parsed.netloc:
        raise UnsafeVipGroupLink("Telegram group link target is required")
    return urlunsplit(("tg", parsed.netloc.lower(), parsed.path, parsed.query, parsed.fragment))
