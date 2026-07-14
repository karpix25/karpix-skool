from datetime import datetime, timedelta, timezone
import hashlib
import hmac
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit
import uuid

from fastapi import HTTPException, Request

from ..config import settings


ALLOWED_FILE_PREFIXES = ("oblozhki/", "avatars/", "generation-sources/")
GENERATION_SOURCE_PREFIX = "generation-sources/"
GENERATION_SOURCE_URL_TTL = timedelta(hours=1)


def get_public_base_url(request: Request) -> str:
    scheme = request.headers.get("x-forwarded-proto", request.url.scheme).split(",")[0]
    host = request.headers.get("x-forwarded-host", request.headers.get("host", request.url.netloc)).split(",")[0]
    return f"{scheme}://{host}"


def build_uploaded_file_url(request: Request, key: str) -> str:
    return f"{get_public_base_url(request)}/upload/files/{key}"


def build_generation_source_url(
    request: Request,
    key: str,
    tenant_id: uuid.UUID,
    *,
    now: datetime | None = None,
) -> str:
    return _signed_generation_source_url(
        build_uploaded_file_url(request, key),
        key,
        tenant_id,
        now=now,
    )


def refresh_generation_source_url(
    url: str,
    *,
    now: datetime | None = None,
) -> str:
    parsed = urlsplit(url)
    marker = "/upload/files/"
    if marker not in parsed.path:
        return url
    key = parsed.path.split(marker, 1)[1]
    tenant_id = generation_source_tenant_id(key)
    if tenant_id is None:
        return url
    unsigned_url = urlunsplit((parsed.scheme, parsed.netloc, parsed.path, "", ""))
    return _signed_generation_source_url(unsigned_url, key, tenant_id, now=now)


def build_uploaded_file_path(key: str) -> str:
    validate_upload_key(key)
    return f"/upload/files/{key}"


def validate_upload_key(key: str) -> None:
    if ".." in key or key.startswith("/") or not key.startswith(ALLOWED_FILE_PREFIXES):
        raise HTTPException(status_code=404, detail="File not found")


def validate_generation_source_access(
    key: str,
    *,
    tenant_id: uuid.UUID | None,
    expires: int | None,
    signature: str | None,
    now: datetime | None = None,
) -> None:
    expected_tenant_id = generation_source_tenant_id(key)
    current_timestamp = _utc_timestamp(now or datetime.now(timezone.utc))
    if (
        expected_tenant_id is None
        or tenant_id != expected_tenant_id
        or expires is None
        or expires <= current_timestamp
        or not signature
    ):
        raise HTTPException(status_code=404, detail="File not found")
    expected_signature = _generation_source_signature(key, tenant_id, expires)
    if not hmac.compare_digest(signature, expected_signature):
        raise HTTPException(status_code=404, detail="File not found")


def generation_source_tenant_id(key: str) -> uuid.UUID | None:
    if not key.startswith(GENERATION_SOURCE_PREFIX):
        return None
    parts = key.split("/", 2)
    if len(parts) < 3:
        return None
    try:
        return uuid.UUID(parts[1])
    except ValueError:
        return None


def _signed_generation_source_url(
    unsigned_url: str,
    key: str,
    tenant_id: uuid.UUID,
    *,
    now: datetime | None,
) -> str:
    if generation_source_tenant_id(key) != tenant_id:
        raise ValueError("Generation source key does not belong to tenant")
    current_time = now or datetime.now(timezone.utc)
    expires = _utc_timestamp(current_time + GENERATION_SOURCE_URL_TTL)
    signature = _generation_source_signature(key, tenant_id, expires)
    parsed = urlsplit(unsigned_url)
    query = dict(parse_qsl(parsed.query, keep_blank_values=True))
    query.update(
        tenant_id=str(tenant_id),
        expires=str(expires),
        signature=signature,
    )
    return urlunsplit(
        (parsed.scheme, parsed.netloc, parsed.path, urlencode(query), parsed.fragment)
    )


def _generation_source_signature(key: str, tenant_id: uuid.UUID, expires: int) -> str:
    payload = f"{key}\n{tenant_id}\n{expires}".encode()
    return hmac.new(settings.SECRET_KEY.encode(), payload, hashlib.sha256).hexdigest()


def _utc_timestamp(value: datetime) -> int:
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    return int(value.astimezone(timezone.utc).timestamp())
