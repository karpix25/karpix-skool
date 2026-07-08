from typing import Optional
from urllib.parse import urlparse


def normalize_source_url(value: Optional[str]) -> Optional[str]:
    if value is None:
        return None

    clean_value = str(value).strip()
    if not clean_value:
        return None

    parsed = urlparse(clean_value)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        raise ValueError("Source link must be an http(s) URL")
    return clean_value


def normalize_required_source_url(value: str) -> str:
    clean_value = normalize_source_url(value)
    if clean_value is None:
        raise ValueError("Source link is required")
    return clean_value
