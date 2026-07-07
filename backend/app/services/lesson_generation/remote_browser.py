from typing import Optional
from urllib.parse import quote, urlencode, urlparse, urlunparse

from ...config import settings


def build_notebooklm_remote_browser_url(token: str) -> Optional[str]:
    if not settings.NOTEBOOKLM_REMOTE_BROWSER_URL:
        return None

    base_url = settings.NOTEBOOKLM_AUTH_PUBLIC_BASE_URL or settings.BACKEND_PUBLIC_URL
    if not base_url:
        return None

    escaped_token = quote(token, safe="")
    websocket_path = f"notebooklm/auth/{escaped_token}/browser/websockify"
    query = urlencode(
        {
            "autoconnect": "true",
            "resize": "scale",
            "path": websocket_path,
        }
    )
    return (
        f"{base_url.rstrip('/')}/notebooklm/auth/"
        f"{escaped_token}/browser/vnc.html?{query}"
    )


def build_remote_browser_http_url(path: str, query: str = "") -> str:
    base_url = _require_remote_browser_base_url()
    normalized_path = _normalize_remote_browser_path(path)
    url = f"{base_url.rstrip('/')}/{normalized_path}"
    if query:
        url = f"{url}?{query}"
    return url


def build_remote_browser_websocket_url(query: str = "") -> str:
    url = build_remote_browser_http_url("websockify", query)
    parsed = urlparse(url)
    scheme = "wss" if parsed.scheme == "https" else "ws"
    return urlunparse(parsed._replace(scheme=scheme))


def _require_remote_browser_base_url() -> str:
    if not settings.NOTEBOOKLM_REMOTE_BROWSER_URL:
        raise ValueError("NOTEBOOKLM_REMOTE_BROWSER_URL is not configured")
    return settings.NOTEBOOKLM_REMOTE_BROWSER_URL


def _normalize_remote_browser_path(path: str) -> str:
    normalized = (path or "vnc.html").lstrip("/")
    if not normalized:
        return "vnc.html"
    if normalized.startswith(("http://", "https://", "//")):
        raise ValueError("Remote browser path must be relative")
    return normalized
