import hashlib
import sys
from types import SimpleNamespace

import pytest

sys.modules.setdefault(
    "aioboto3",
    SimpleNamespace(Session=lambda: SimpleNamespace(client=lambda *_args, **_kwargs: None)),
)

from app.services import user as user_service


class FakeResponse:
    status = 200

    async def __aenter__(self):
        return self

    async def __aexit__(self, *_args):
        return None

    async def read(self):
        return b"avatar-bytes"


class FakeClientSession:
    async def __aenter__(self):
        return self

    async def __aexit__(self, *_args):
        return None

    def get(self, _url):
        return FakeResponse()


class FakeStorage:
    def __init__(self):
        self.saved = None

    def build_key(self, *, filename: str, folder: str, use_uuid: bool):
        return f"{folder}/{filename}"

    async def put_file(self, *, file_content: bytes, key: str):
        self.saved = {"file_content": file_content, "key": key}


@pytest.mark.asyncio
async def test_sync_user_avatar_saves_backend_upload_path(monkeypatch):
    photo_url = "https://t.me/i/userpic.jpg"
    fake_storage = FakeStorage()
    user = SimpleNamespace(telegram_id=12345, avatar_url=None)

    monkeypatch.setattr(user_service.aiohttp, "ClientSession", FakeClientSession)
    monkeypatch.setattr(user_service, "storage", fake_storage)

    changed = await user_service.sync_user_avatar(user, SimpleNamespace(), photo_url)

    expected_hash = hashlib.md5(photo_url.encode()).hexdigest()
    expected_key = f"avatars/12345_{expected_hash}.jpg"
    assert changed is True
    assert fake_storage.saved == {"file_content": b"avatar-bytes", "key": expected_key}
    assert user.avatar_url == f"/upload/files/{expected_key}"
    assert "cloudflarestorage.com" not in user.avatar_url
