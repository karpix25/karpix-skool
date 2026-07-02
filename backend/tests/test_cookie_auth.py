import uuid
from types import SimpleNamespace

import pytest
from fastapi import Response
from starlette.requests import Request

from app.auth import create_access_token
from app.auth_cookies import ACCESS_TOKEN_COOKIE_NAME
from app.models import User
from app.routes import auth as auth_routes


def make_request(cookie_value: str | None = None) -> Request:
    headers = []
    if cookie_value:
        headers.append((b"cookie", f"{ACCESS_TOKEN_COOKIE_NAME}={cookie_value}".encode()))
    return Request(
        {
            "type": "http",
            "method": "GET",
            "path": "/webapp/me",
            "headers": headers,
            "query_string": b"",
        }
    )


class FakeResult:
    def __init__(self, user: User | None):
        self.user = user

    def first(self):
        return self.user


class FakeSession:
    def __init__(self, *users: User):
        self.users = {str(user.id): user for user in users}

    async def get(self, _model, item_id):
        return self.users.get(str(item_id))

    async def exec(self, _statement):
        return FakeResult(next(iter(self.users.values()), None))


@pytest.mark.asyncio
async def test_get_current_user_accepts_access_cookie_without_bearer():
    user = User(id=uuid.uuid4(), username="cookie-user")
    token = create_access_token(subject=str(user.id))
    request = make_request(token)

    current_user = await auth_routes.get_current_user(
        request=request,
        token=None,
        session=FakeSession(user),
    )

    assert current_user == user


@pytest.mark.asyncio
async def test_get_current_user_falls_back_to_bearer_when_cookie_is_invalid():
    user = User(id=uuid.uuid4(), username="bearer-user")
    token = create_access_token(subject=str(user.id))

    current_user = await auth_routes.get_current_user(
        request=make_request("not-a-jwt"),
        token=token,
        session=FakeSession(user),
    )

    assert current_user == user


@pytest.mark.asyncio
async def test_login_sets_secure_httponly_cookie_and_preserves_bearer_response(monkeypatch):
    user = User(id=uuid.uuid4(), email="ada@example.com", password_hash="hash")
    response = Response()
    form_data = SimpleNamespace(username=user.email, password="correct-password")
    monkeypatch.setattr(auth_routes, "verify_password", lambda _plain, _hashed: True)

    payload = await auth_routes.login(
        response=response,
        form_data=form_data,
        session=FakeSession(user),
    )

    set_cookie = response.headers["set-cookie"]
    assert payload["access_token"]
    assert payload["token_type"] == "bearer"
    assert payload["is_super_admin"] is False
    assert f"{ACCESS_TOKEN_COOKIE_NAME}=" in set_cookie
    assert "HttpOnly" in set_cookie
    assert "Secure" in set_cookie
    assert "samesite=lax" in set_cookie.lower()


@pytest.mark.asyncio
async def test_logout_clears_access_cookie():
    response = Response()

    payload = await auth_routes.logout(response)

    set_cookie = response.headers["set-cookie"]
    assert payload == {"message": "Logged out"}
    assert f"{ACCESS_TOKEN_COOKIE_NAME}=" in set_cookie
    assert "Max-Age=0" in set_cookie
