import uuid
from datetime import datetime, timedelta

import pytest

from app.models import OneTimeToken, User
from app.services.auth_service import verify_desktop_auth_token


class FakeScalars:
    def __init__(self, value):
        self.value = value

    def first(self):
        return self.value


class FakeResult:
    def __init__(self, value):
        self.value = value

    def scalars(self):
        return FakeScalars(self.value)


class FakeDesktopAuthDb:
    def __init__(self, token: OneTimeToken, user: User):
        self.token = token
        self.user = user
        self.execute_calls = 0
        self.added = []
        self.commits = 0

    async def execute(self, _statement):
        self.execute_calls += 1
        if self.execute_calls % 2 == 1:
            if self.token.used_at is None and self.token.expires_at > datetime.utcnow():
                return FakeResult(self.token)
            return FakeResult(None)
        return FakeResult(self.user)

    def add(self, item):
        self.added.append(item)

    async def commit(self):
        self.commits += 1


@pytest.mark.asyncio
async def test_verify_desktop_auth_token_is_single_use():
    user = User(id=uuid.uuid4(), telegram_id=123)
    token = OneTimeToken(
        user_id=user.id,
        token="desktop-token",
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
        token="expired-token",
        expires_at=datetime.utcnow() - timedelta(seconds=1),
    )
    db = FakeDesktopAuthDb(token, user)

    assert await verify_desktop_auth_token(db, "expired-token") is None
    assert token.used_at is None
    assert db.commits == 0
