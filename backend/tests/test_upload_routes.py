import uuid
import sys
import types
from io import BytesIO

import pytest
from fastapi import HTTPException, UploadFile
from starlette.requests import Request

fake_aioboto3 = types.ModuleType("aioboto3")
fake_aioboto3.Session = lambda: object()
sys.modules.setdefault("aioboto3", fake_aioboto3)

from app.models import Tenant, User
from app.routes import upload as upload_routes
from app.services.upload_urls import build_uploaded_file_path, build_uploaded_file_url, validate_upload_key


def make_request(headers: list[tuple[bytes, bytes]]) -> Request:
    return Request(
        {
            "type": "http",
            "method": "POST",
            "path": "/upload/upload",
            "headers": headers,
            "scheme": "http",
            "server": ("127.0.0.1", 8000),
        }
    )


def test_build_uploaded_file_url_uses_forwarded_host_and_proto():
    request = make_request(
        [
            (b"host", b"127.0.0.1"),
            (b"x-forwarded-host", b"api.karpix.com"),
            (b"x-forwarded-proto", b"https"),
        ]
    )

    assert (
        build_uploaded_file_url(request, "oblozhki/example.png")
        == "https://api.karpix.com/upload/files/oblozhki/example.png"
    )


def test_build_uploaded_file_url_uses_first_forwarded_value():
    request = make_request(
        [
            (b"host", b"127.0.0.1"),
            (b"x-forwarded-host", b"api.karpix.com, internal.local"),
            (b"x-forwarded-proto", b"https, http"),
        ]
    )

    assert (
        build_uploaded_file_url(request, "avatars/user.png")
        == "https://api.karpix.com/upload/files/avatars/user.png"
    )


def test_build_uploaded_file_url_falls_back_to_request_host():
    request = make_request([(b"host", b"127.0.0.1:8000")])

    assert (
        build_uploaded_file_url(request, "oblozhki/example.png")
        == "http://127.0.0.1:8000/upload/files/oblozhki/example.png"
    )


def test_validate_upload_key_allows_known_prefixes():
    validate_upload_key("oblozhki/example.png")
    validate_upload_key("avatars/user.jpg")


def test_build_uploaded_file_path_returns_backend_route_path():
    assert build_uploaded_file_path("avatars/user.jpg") == "/upload/files/avatars/user.jpg"


def test_validate_upload_key_rejects_unknown_or_unsafe_keys():
    for key in ["private/example.png", "../secret", "/oblozhki/example.png", "oblozhki/../secret"]:
        with pytest.raises(HTTPException) as exc_info:
            validate_upload_key(key)
        assert exc_info.value.status_code == 404


class FakeStorage:
    def __init__(self):
        self.built = None
        self.saved = None

    def build_key(self, *, filename: str, folder: str) -> str:
        self.built = {"filename": filename, "folder": folder}
        return f"{folder}/{filename}"

    async def put_file(self, *, file_content: bytes, key: str, content_type: str):
        self.saved = {
            "file_content": file_content,
            "key": key,
            "content_type": content_type,
        }


@pytest.mark.asyncio
async def test_upload_file_scopes_key_to_active_tenant(monkeypatch):
    tenant_id = uuid.uuid4()
    tenant = Tenant(id=tenant_id, name="School")
    png = b"\x89PNG\r\n\x1a\npayload"
    fake_storage = FakeStorage()
    monkeypatch.setattr(upload_routes, "storage", fake_storage)

    class FakeSession:
        async def get(self, _model, item_id):
            return tenant if item_id == tenant.id else None

    async def allow_upload(_session, checked_tenant, byte_count):
        assert checked_tenant.id == tenant.id
        assert byte_count == len(png)
        return byte_count

    monkeypatch.setattr(upload_routes, "reserve_storage_bytes", allow_upload)

    result = await upload_routes.upload_file(
        make_request([(b"host", b"api.karpix.com"), (b"x-forwarded-proto", b"https")]),
        UploadFile(filename="../cover.svg", file=BytesIO(png), headers={"content-type": "image/png"}),
        User(id=uuid.uuid4()),
        tenant_id,
        FakeSession(),
    )

    assert fake_storage.built == {
        "filename": "cover.png",
        "folder": f"oblozhki/{tenant_id}",
    }
    assert fake_storage.saved == {
        "file_content": png,
        "key": f"oblozhki/{tenant_id}/cover.png",
        "content_type": "image/png",
    }
    assert result["url"] == f"https://api.karpix.com/upload/files/oblozhki/{tenant_id}/cover.png"
