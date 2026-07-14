import sys
from types import SimpleNamespace

import pytest
from fastapi import Response

sys.modules.setdefault(
    "aioboto3",
    SimpleNamespace(Session=lambda: SimpleNamespace(client=lambda *_args, **_kwargs: None)),
)

from app.models import User
from app.routes import webapp


class FakeResult:
    def __init__(self, value=None):
        self.value = value

    def first(self):
        return self.value


class FakeSession:
    def __init__(self):
        self.results = [FakeResult(), FakeResult(), FakeResult()]
        self.added = []
        self.committed = False
        self.flushed = False
        self.refreshed = []

    async def exec(self, _statement):
        if not self.results:
            raise AssertionError("Unexpected database query")
        return self.results.pop(0)

    def add(self, item):
        self.added.append(item)

    async def flush(self):
        self.flushed = True

    async def commit(self):
        self.committed = True

    async def refresh(self, item):
        self.refreshed.append(item)


class FakeBot:
    def __init__(self, token):
        self.token = token
        self.session = SimpleNamespace(close=self.close)
        self.closed = False

    async def close(self):
        self.closed = True


@pytest.mark.asyncio
async def test_webapp_login_syncs_avatar_on_first_login(monkeypatch):
    session = FakeSession()
    synced = []

    monkeypatch.setattr(webapp, "require_valid_init_data", lambda *_args, **_kwargs: None)
    monkeypatch.setattr(
        webapp,
        "parse_webapp_user_data",
        lambda _init_data: SimpleNamespace(
            telegram_id=123,
            username="student",
            photo_url="https://t.me/i/userpic.jpg",
            start_param=None,
        ),
    )
    monkeypatch.setattr(webapp, "Bot", FakeBot)

    async def fake_sync_user_avatar(user, _bot, photo_url):
        synced.append((user.telegram_id, photo_url))
        user.avatar_url = "https://cdn.example.com/avatar.jpg"
        return True

    monkeypatch.setattr(webapp, "sync_user_avatar", fake_sync_user_avatar)

    await webapp.webapp_login(
        response=Response(),
        init_data="signed-init-data",
        session=session,
    )

    user = next(item for item in session.added if isinstance(item, User))
    assert user.avatar_url == "https://cdn.example.com/avatar.jpg"
    assert synced == [(123, "https://t.me/i/userpic.jpg")]
    assert session.flushed is True
    assert session.committed is True
    assert len(session.results) == 1
