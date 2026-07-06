import uuid
from datetime import datetime, timedelta

import pytest

from app.models import OneTimeToken, User
from app.services.auth_service import (
    create_desktop_auth_token,
    hash_desktop_auth_token,
    verify_desktop_auth_token,
)


class FakeScalarResult:
    def __init__(self, value):
        self.value = value

    def scalar_one_or_none(self):
        return self.value


class FakeDesktopAuthDb:
    def __init__(self, token: OneTimeToken, user: User):
        self.token = token
        self.user = user
        self.execute_calls = 0
        self.commits = 0

    async def execute(self, _statement):
        self.execute_calls += 1
        if self.token.used_at is None and self.token.expires_at > datetime.utcnow():
            self.token.used_at = datetime.utcnow()
            return FakeScalarResult(self.token.user_id)
        return FakeScalarResult(None)

    async def commit(self):
        self.commits += 1

    async def get(self, _model, item_id):
        if item_id == self.user.id:
            return self.user
        return None


class FakeIssueDb:
    def __init__(self):
        self.added = []
        self.commits = 0

    def add(self, item):
        self.added.append(item)

    async def commit(self):
        self.commits += 1


@pytest.mark.asyncio
async def test_create_desktop_auth_token_stores_hash_only(monkeypatch):
    user = User(id=uuid.uuid4(), telegram_id=123)
    db = FakeIssueDb()
    monkeypatch.setattr("app.services.auth_service.secrets.token_urlsafe", lambda _n: "desktop-token")

    token, login_url = await create_desktop_auth_token(db, user)

    record = db.added[0]
    assert token == "desktop-token"
    assert "token=desktop-token" in login_url
    assert record.token_hash == hash_desktop_auth_token("desktop-token")
    assert record.token_hash != "desktop-token"
    assert not hasattr(record, "token")
    assert db.commits == 1


@pytest.mark.asyncio
async def test_verify_desktop_auth_token_is_single_use():
    user = User(id=uuid.uuid4(), telegram_id=123)
    token = OneTimeToken(
        user_id=user.id,
        token_hash=hash_desktop_auth_token("desktop-token"),
        expires_at=datetime.utcnow() + timedelta(minutes=5),
    )
    db = FakeDesktopAuthDb(token, user)

    verified_user = await verify_desktop_auth_token(db, "desktop-token")
    replay_user = await verify_desktop_auth_token(db, "desktop-token")

    assert verified_user == user
    assert replay_user is None
    assert token.used_at is not None
    assert db.commits == 1


@pytest.mark.asyncio
async def test_verify_desktop_auth_token_rejects_expired_token():
    user = User(id=uuid.uuid4(), telegram_id=123)
    token = OneTimeToken(
        user_id=user.id,
        token_hash=hash_desktop_auth_token("expired-token"),
        expires_at=datetime.utcnow() - timedelta(seconds=1),
    )
    db = FakeDesktopAuthDb(token, user)

    assert await verify_desktop_auth_token(db, "expired-token") is None
    assert token.used_at is None
    assert db.commits == 0
