import uuid
from datetime import UTC, datetime

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.models import NotebookGenerationProvider, User
from app.routes import super_generation_settings
from app.routes.auth import get_super_user
from app.services import notebooklm_auth
from app.services.notebooklm_auth import (
    AUTH_CHECK_COMMAND,
    AUTH_LOGIN_COMMAND,
    AUTH_REFRESH_COMMAND,
    NotebookLmAuthResult,
    check_notebooklm_auth,
    login_notebooklm_auth,
    refresh_notebooklm_auth,
)


class FakeProcess:
    def __init__(self, *, returncode=0, stdout=b"", stderr=b""):
        self.returncode = returncode
        self._stdout = stdout
        self._stderr = stderr

    async def communicate(self):
        return self._stdout, self._stderr


def _installed_package():
    return "/usr/local/bin/notebooklm"


@pytest.mark.asyncio
async def test_check_returns_package_missing_without_running_cli(monkeypatch):
    commands = []

    async def fake_subprocess(*command, **_kwargs):
        commands.append(command)
        return FakeProcess()

    monkeypatch.setattr(notebooklm_auth, "which", lambda _name: None)
    monkeypatch.setattr(notebooklm_auth.asyncio, "create_subprocess_exec", fake_subprocess)

    result = await check_notebooklm_auth()

    assert result.status == "package_missing"
    assert commands == []


@pytest.mark.asyncio
async def test_check_runs_cli_with_safe_notebooklm_env(monkeypatch):
    calls = []
    monkeypatch.setattr(notebooklm_auth, "which", lambda _name: _installed_package())
    monkeypatch.setattr(notebooklm_auth.settings, "NOTEBOOKLM_HOME", "/tmp/notebooklm-home")
    monkeypatch.setattr(notebooklm_auth.settings, "NOTEBOOKLM_PROFILE", "karpix")
    monkeypatch.setenv("SECRET_KEY", "must-not-leak")

    async def fake_subprocess(*command, stdout, stderr, env):
        calls.append({"command": command, "stdout": stdout, "stderr": stderr, "env": env})
        return FakeProcess(stdout=b'{"status": "ok", "message": "valid"}')

    monkeypatch.setattr(notebooklm_auth.asyncio, "create_subprocess_exec", fake_subprocess)

    result = await check_notebooklm_auth()

    assert result.status == "ok"
    assert result.message == "valid"
    assert calls[0]["command"] == AUTH_CHECK_COMMAND
    assert calls[0]["env"]["NOTEBOOKLM_HOME"] == "/tmp/notebooklm-home"
    assert calls[0]["env"]["NOTEBOOKLM_PROFILE"] == "karpix"
    assert "SECRET_KEY" not in calls[0]["env"]


@pytest.mark.asyncio
async def test_check_returns_readable_storage_error_for_missing_home_parent(monkeypatch):
    commands = []
    monkeypatch.setattr(notebooklm_auth, "which", lambda _name: _installed_package())
    monkeypatch.setattr(notebooklm_auth.settings, "NOTEBOOKLM_HOME", "/nonexistent/.notebooklm")

    async def fake_subprocess(*command, **_kwargs):
        commands.append(command)
        return FakeProcess(stdout=b'{"status": "ok"}')

    monkeypatch.setattr(notebooklm_auth.asyncio, "create_subprocess_exec", fake_subprocess)

    result = await check_notebooklm_auth()

    assert result.status == "storage_error"
    assert result.message == (
        "NotebookLM storage directory cannot be created because its parent directory does not exist."
    )
    assert result.detail == {
        "home": "/nonexistent/.notebooklm",
        "parent": "/nonexistent",
        "reason": "missing_parent",
    }
    assert commands == []


@pytest.mark.asyncio
async def test_login_does_not_start_cli_when_storage_is_invalid(monkeypatch):
    commands = []
    monkeypatch.setattr(notebooklm_auth, "which", lambda _name: _installed_package())
    monkeypatch.setattr(notebooklm_auth.settings, "NOTEBOOKLM_HOME", "/nonexistent/.notebooklm")

    async def fake_subprocess(*command, **_kwargs):
        commands.append(command)
        return FakeProcess(stdout=b'{"status": "ok"}')

    monkeypatch.setattr(notebooklm_auth.asyncio, "create_subprocess_exec", fake_subprocess)

    result = await login_notebooklm_auth()

    assert result.status == "storage_error"
    assert commands == []


@pytest.mark.asyncio
async def test_check_maps_storage_traceback_to_human_message(monkeypatch):
    stderr = (
        'Traceback (most recent call last):\n'
        '  File "...", line 1, in <module>\n'
        "FileNotFoundError: [Errno 2] No such file or directory: '/nonexistent/.notebooklm'\n"
    ).encode()
    monkeypatch.setattr(notebooklm_auth, "which", lambda _name: _installed_package())
    monkeypatch.setattr(notebooklm_auth.settings, "NOTEBOOKLM_HOME", None)

    async def fake_subprocess(*_command, **_kwargs):
        return FakeProcess(returncode=1, stderr=stderr)

    monkeypatch.setattr(notebooklm_auth.asyncio, "create_subprocess_exec", fake_subprocess)

    result = await check_notebooklm_auth()

    assert result.status == "storage_error"
    assert result.message == "NotebookLM storage directory is not available. Check NOTEBOOKLM_HOME on the server."
    assert "Traceback" not in result.message


@pytest.mark.asyncio
async def test_check_maps_missing_auth_expired_and_network_errors(monkeypatch):
    outputs = [
        FakeProcess(returncode=1, stderr=b"not authenticated"),
        FakeProcess(returncode=1, stdout=b'{"status": "expired"}'),
        FakeProcess(returncode=1, stderr=b"network timeout"),
    ]
    monkeypatch.setattr(notebooklm_auth, "which", lambda _name: _installed_package())

    async def fake_subprocess(*_command, **_kwargs):
        return outputs.pop(0)

    monkeypatch.setattr(notebooklm_auth.asyncio, "create_subprocess_exec", fake_subprocess)

    assert (await check_notebooklm_auth()).status == "missing_auth"
    assert (await check_notebooklm_auth()).status == "expired"
    assert (await check_notebooklm_auth()).status == "network_error"


@pytest.mark.asyncio
async def test_login_does_not_start_login_when_auth_is_ok(monkeypatch):
    commands = []
    monkeypatch.setattr(notebooklm_auth, "which", lambda _name: _installed_package())

    async def fake_subprocess(*command, **_kwargs):
        commands.append(command)
        return FakeProcess(stdout=b'{"status": "ok"}')

    monkeypatch.setattr(notebooklm_auth.asyncio, "create_subprocess_exec", fake_subprocess)

    result = await login_notebooklm_auth()

    assert result.status == "ok"
    assert commands == [AUTH_CHECK_COMMAND]


@pytest.mark.asyncio
async def test_login_starts_cli_when_auth_is_missing(monkeypatch):
    commands = []
    processes = [
        FakeProcess(returncode=1, stderr=b"not authenticated"),
        FakeProcess(stdout=b'{"status": "ok"}'),
        FakeProcess(stdout=b'{"status": "ok"}'),
    ]
    monkeypatch.setattr(notebooklm_auth, "which", lambda _name: _installed_package())

    async def fake_subprocess(*command, **_kwargs):
        commands.append(command)
        return processes.pop(0)

    monkeypatch.setattr(notebooklm_auth.asyncio, "create_subprocess_exec", fake_subprocess)

    result = await login_notebooklm_auth()

    assert result.status == "ok"
    assert commands == [AUTH_CHECK_COMMAND, AUTH_LOGIN_COMMAND, AUTH_CHECK_COMMAND]


@pytest.mark.asyncio
async def test_refresh_runs_refresh_then_verifies_auth(monkeypatch):
    commands = []
    monkeypatch.setattr(notebooklm_auth, "which", lambda _name: _installed_package())

    async def fake_subprocess(*command, **_kwargs):
        commands.append(command)
        return FakeProcess(stdout=b'{"status": "ok"}')

    monkeypatch.setattr(notebooklm_auth.asyncio, "create_subprocess_exec", fake_subprocess)

    result = await refresh_notebooklm_auth()

    assert result.status == "ok"
    assert commands == [AUTH_REFRESH_COMMAND, AUTH_CHECK_COMMAND]


def test_superadmin_notebooklm_auth_endpoints(monkeypatch):
    app = FastAPI()
    app.include_router(super_generation_settings.router, prefix="/super")

    async def override_super_user():
        return User(id=uuid.uuid4(), is_super_admin=True)

    async def fake_login():
        return NotebookLmAuthResult(
            status="missing_auth",
            message="login required",
            profile="karpix",
            home="/tmp/notebooklm-home",
        )

    async def fake_refresh():
        return NotebookLmAuthResult(
            status="ok",
            message="NotebookLM auth is valid.",
            profile="karpix",
            home="/tmp/notebooklm-home",
            detail={"status": "ok"},
        )

    imported = []

    def fake_import(storage_state):
        imported.append(storage_state)

    app.dependency_overrides[get_super_user] = override_super_user
    monkeypatch.setattr(super_generation_settings, "login_notebooklm_auth", fake_login)
    monkeypatch.setattr(super_generation_settings, "refresh_notebooklm_auth", fake_refresh)
    monkeypatch.setattr(super_generation_settings, "import_notebooklm_storage_state", fake_import)
    monkeypatch.setattr(super_generation_settings, "check_notebooklm_auth", fake_refresh)
    monkeypatch.setattr(super_generation_settings.settings, "NOTEBOOKLM_AUTH_BROWSER_URL", "https://vnc.example.test")
    client = TestClient(app)

    login_response = client.post("/super/generation-settings/notebooklm-auth/login")
    refresh_response = client.post("/super/generation-settings/notebooklm-auth/refresh")
    import_response = client.post(
        "/super/generation-settings/notebooklm-auth/import",
        json={
            "storage_state": {
                "cookies": [{"name": "SID"}, {"name": "__Secure-1PSIDTS"}]
            }
        },
    )

    assert login_response.status_code == 200
    assert login_response.json()["status"] == "missing_auth"
    assert login_response.json()["browser_url"] == "https://vnc.example.test"
    assert refresh_response.status_code == 200
    assert refresh_response.json()["detail"] == {"status": "ok"}
    assert import_response.status_code == 200
    assert import_response.json()["authenticated"] is False
    assert imported == [
        {"cookies": [{"name": "SID"}, {"name": "__Secure-1PSIDTS"}]}
    ]


def test_generation_settings_marks_google_configured_only_when_authenticated():
    class FakeSettingsRecord:
        notebook_provider = NotebookGenerationProvider.google_notebooklm
        updated_at = datetime.now(UTC)

    response = super_generation_settings._settings_read(
        FakeSettingsRecord(),
        NotebookLmAuthResult(
            status="missing_auth",
            message="login required",
            profile="karpix",
            package_installed=True,
            authenticated=False,
        ),
    )

    assert response.google_notebooklm_configured is False
    assert response.google_notebooklm_auth is not None
    assert response.google_notebooklm_auth.package_installed is True


def test_notebooklm_auth_read_does_not_embed_google_directly(monkeypatch):
    monkeypatch.setattr(
        super_generation_settings.settings,
        "NOTEBOOKLM_AUTH_BROWSER_URL",
        "https://notebooklm.google.com/",
    )

    response = super_generation_settings._auth_read(
        NotebookLmAuthResult(
            status="missing_auth",
            message="login required",
            profile="karpix",
            package_installed=True,
            authenticated=False,
        ),
    )

    assert response.browser_url is None
