from typing import Iterable, Optional
from urllib.parse import unquote, urlparse

OPEN_NOTEBOOK_PREFIX = "notebook:"


def extract_open_notebook_id(value: Optional[str]) -> Optional[str]:
    clean_value = (value or "").strip()
    if not clean_value:
        return None

    decoded_value = unquote(clean_value)
    if decoded_value.startswith(OPEN_NOTEBOOK_PREFIX):
        return decoded_value

    parsed = urlparse(clean_value)
    if parsed.scheme in {"http", "https"} and parsed.netloc:
        for part in reversed(parsed.path.split("/")):
            decoded_part = unquote(part.strip())
            if decoded_part.startswith(OPEN_NOTEBOOK_PREFIX):
                return decoded_part

    return None


def open_notebook_id_from_sources(sources: Iterable) -> Optional[str]:
    for source in sources:
        if getattr(source, "kind", None) != "open_notebook":
            continue
        notebook_id = extract_open_notebook_id(
            getattr(source, "content", None)
            or getattr(source, "url", None)
            or getattr(source, "title", None)
        )
        if notebook_id:
            return notebook_id
    return None
