import uuid
from datetime import datetime, timedelta

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.db import get_session
from app.models_generation import (
    LessonGenerationJob,
    LessonGenerationJobStatus,
    NotebookLMAuthSession,
    NotebookLMAuthSessionStatus,
)
from app.routes import notebooklm_auth
from app.services.lesson_generation import auth_sessions, jobs
from app.services.lesson_generation.auth_pages import render_notebooklm_auth_page
from app.services.lesson_generation.auth_sessions import (
    NotebookLMAuthLaunchResult,
    NotebookLMAuthSessionError,
    create_notebooklm_auth_session,
    hash_notebooklm_auth_token,
    launch_or_check_notebooklm_auth,
)
from app.services.lesson_generation.remote_browser import build_notebooklm_remote_browser_url


class FakeResult:
    def __init__(self, items):
        self.items = list(items)

    def first(self):
        return self.items[0] if self.items else None


class FakeIssueSession:
    def __init__(self):
        self.added = []
        self.commits = 0
        self.refreshed = []

    def add(self, item):
        self.added.append(item)

    async def commit(self):
        self.commits += 1

    async def refresh(self, item):
        self.refreshed.append(item)


class FakeAuthSession:
    def __init__(self, record):
        self.record = record
        self.commits = 0
        self.refreshed = []
        self.added = []

    async def exec(self, _stmt):
        return FakeResult([self.record])

    def add(self, item):
        self.added.append(item)

    async def commit(self):
        self.commits += 1

    async def refresh(self, item):
        self.refreshed.append(item)


class FakeNotebookLMClient:
    def __init__(self, *, authenticated=False):
        self.authenticated = authenticated
        self.setup_calls = 0
        self.health_calls = 0

    async def setup_auth(self, *, show_browser=True):
        self.setup_calls += 1
        return {"window": "opened", "show_browser": show_browser}

    async def health(self):
        self.health_calls += 1
        return {"authenticated": self.authenticated}


class FakeJobSession:
    def __init__(self, job):
        self.job = job
        self.added = []
        self.commits = 0

    async def __aenter__(self):
        return self

    async def __aexit__(self, *_args):
        return False

    async def get(self, model, item_id):
        if model is LessonGenerationJob and item_id == self.job.id:
            return self.job
        return None

    def add(self, item):
        self.added.append(item)

    async def commit(self):
        self.commits += 1


@pytest.mark.asyncio
async def test_create_notebooklm_auth_session_stores_hash_and_backend_url(monkeypatch):
    db = FakeIssueSession()
    requested_by_user_id = uuid.uuid4()
    job_id = uuid.uuid4()
    monkeypatch.setattr(auth_sessions.settings, "BACKEND_PUBLIC_URL", "https://api.example.com")
    monkeypatch.setattr(auth_sessions.settings, "NOTEBOOKLM_AUTH_PUBLIC_BASE_URL", None)
    monkeypatch.setattr(auth_sessions.secrets, "token_urlsafe", lambda _n: "raw-auth-token")

    record, token = await create_notebooklm_auth_session(
        session=db,
        requested_by_user_id=requested_by_user_id,
        job_id=job_id,
        reason="auth broken",
    )

    assert token == "raw-auth-token"
    assert record.token_hash == hash_notebooklm_auth_token("raw-auth-token")
    assert record.token_hash != "raw-auth-token"
    assert record.auth_url == "https://api.example.com/notebooklm/auth/raw-auth-token"
    assert record.requested_by_user_id == requested_by_user_id
    assert record.job_id == job_id
    assert db.commits == 1


@pytest.mark.asyncio
async def test_launch_notebooklm_auth_allows_refresh_until_google_login_completes():
    record = NotebookLMAuthSession(
        token_hash=hash_notebooklm_auth_token("raw-auth-token"),
        expires_at=datetime.utcnow() + timedelta(minutes=5),
    )
    db = FakeAuthSession(record)
    client = FakeNotebookLMClient(authenticated=False)

    result = await launch_or_check_notebooklm_auth(session=db, token="raw-auth-token", client=client)

    assert result.authenticated is False
    assert record.status == NotebookLMAuthSessionStatus.started
    assert record.used_at is not None
    assert record.setup_result_json == {"window": "opened", "show_browser": True}
    assert record.health_json == {"authenticated": False}
    assert client.setup_calls == 1
    assert client.health_calls == 1

    client.authenticated = True
    result = await launch_or_check_notebooklm_auth(session=db, token="raw-auth-token", client=client)

    assert result.authenticated is True
    assert record.status == NotebookLMAuthSessionStatus.completed
    assert client.setup_calls == 1
    assert client.health_calls == 2


@pytest.mark.asyncio
async def test_launch_notebooklm_auth_marks_expired_link():
    record = NotebookLMAuthSession(
        token_hash=hash_notebooklm_auth_token("raw-auth-token"),
        expires_at=datetime.utcnow() - timedelta(minutes=1),
    )
    db = FakeAuthSession(record)

    with pytest.raises(NotebookLMAuthSessionError) as exc_info:
        await launch_or_check_notebooklm_auth(
            session=db,
            token="raw-auth-token",
            client=FakeNotebookLMClient(),
        )

    assert exc_info.value.status_code == 410
    assert record.status == NotebookLMAuthSessionStatus.expired


def test_notebooklm_auth_route_returns_json(monkeypatch):
    record = NotebookLMAuthSession(
        id=uuid.uuid4(),
        token_hash="x" * 64,
        status=NotebookLMAuthSessionStatus.completed,
        expires_at=datetime.utcnow() + timedelta(minutes=5),
        used_at=datetime.utcnow(),
    )
    app = FastAPI()
    app.include_router(notebooklm_auth.router)

    async def override_session():
        return object()

    async def fake_launch(**_kwargs):
        return NotebookLMAuthLaunchResult(record, "ok", True)

    app.dependency_overrides[get_session] = override_session
    monkeypatch.setattr(notebooklm_auth, "launch_or_check_notebooklm_auth", fake_launch)

    client = TestClient(app)
    response = client.get("/notebooklm/auth/raw-auth-token?format=json")

    assert response.status_code == 200
    body = response.json()
    assert body["id"] == str(record.id)
    assert body["status"] == NotebookLMAuthSessionStatus.completed
    assert body["authenticated"] is True
    assert body["remote_browser_url"] is None
    assert body["used_at"] is not None


def test_notebooklm_remote_browser_url_uses_token_gated_backend_path(monkeypatch):
    monkeypatch.setattr(auth_sessions.settings, "NOTEBOOKLM_REMOTE_BROWSER_URL", "http://notebooklm:6080")
    monkeypatch.setattr(auth_sessions.settings, "NOTEBOOKLM_AUTH_PUBLIC_BASE_URL", "https://api.example.com")

    url = build_notebooklm_remote_browser_url("raw-auth-token")

    assert url is not None
    assert url.startswith("https://api.example.com/notebooklm/auth/raw-auth-token/browser/vnc.html")
    assert "path=notebooklm%2Fauth%2Fraw-auth-token%2Fbrowser%2Fwebsockify" in url


def test_notebooklm_auth_page_shows_remote_browser_link():
    record = NotebookLMAuthSession(
        id=uuid.uuid4(),
        token_hash="x" * 64,
        status=NotebookLMAuthSessionStatus.started,
        expires_at=datetime.utcnow() + timedelta(minutes=5),
    )
    result = NotebookLMAuthLaunchResult(
        record,
        "Окно авторизации запущено.",
        False,
        "https://api.example.com/notebooklm/auth/raw/browser/vnc.html",
    )

    html = render_notebooklm_auth_page(result)

    assert "Открыть серверный браузер" in html
    assert "https://api.example.com/notebooklm/auth/raw/browser/vnc.html" in html


@pytest.mark.asyncio
async def test_jobs_auth_error_marks_needs_reauth_and_notifies(monkeypatch):
    job = LessonGenerationJob(
        tenant_id=uuid.uuid4(),
        course_id=uuid.uuid4(),
        module_id=uuid.uuid4(),
        created_by_user_id=uuid.uuid4(),
        notebook_url="https://notebooklm.google.com/notebook/example",
        status=LessonGenerationJobStatus.running,
    )
    db = FakeJobSession(job)
    notifications = []

    async def fake_notify(**kwargs):
        notifications.append(kwargs)

    monkeypatch.setattr(jobs, "async_session_maker", lambda: db)
    monkeypatch.setattr(jobs, "notify_super_admin_notebooklm_reauth", fake_notify)

    await jobs._mark_needs_reauth_and_notify(job.id, "Google login required")

    assert job.status == LessonGenerationJobStatus.needs_reauth
    assert job.error == "Google login required"
    assert db.commits == 1
    assert len(notifications) == 1
    assert notifications[0]["job"] == job
    assert notifications[0]["reason"] == "Google login required"
