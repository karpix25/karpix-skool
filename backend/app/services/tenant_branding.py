import re
from typing import Optional
from urllib.parse import urlparse


HEX_COLOR_PATTERN = re.compile(r"^#[0-9a-fA-F]{6}$")


class UnsafeBrandingValue(ValueError):
    pass


def normalize_brand_url(value: Optional[str], *, field_name: str) -> Optional[str]:
    normalized = (value or "").strip()
    if not normalized:
        return None
    parsed = urlparse(normalized)
    if parsed.scheme != "https" or not parsed.netloc or parsed.username or parsed.password:
        raise UnsafeBrandingValue(f"{field_name} must be a public HTTPS URL.")
    return normalized


def normalize_accent_color(value: Optional[str]) -> Optional[str]:
    normalized = (value or "").strip()
    if not normalized:
        return None
    if not HEX_COLOR_PATTERN.fullmatch(normalized):
        raise UnsafeBrandingValue("Accent color must use #RRGGBB format.")
    return normalized.upper()
