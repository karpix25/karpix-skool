import asyncio
import json
import os
from dataclasses import dataclass
from enum import StrEnum
from pathlib import Path
from shutil import which
from typing import Any

from ..config import settings


NOTEBOOKLM_AUTH_TIMEOUT_SECONDS = 300
SAFE_ENV_KEYS = ("PATH", "HOME", "LANG", "LC_ALL", "USER", "TMPDIR")
AUTH_CHECK_COMMAND = ("notebooklm", "auth", "check", "--test", "--json")
AUTH_LOGIN_COMMAND = ("notebooklm", "login")
AUTH_REFRESH_COMMAND = ("notebooklm", "auth", "refresh", "--quiet")


class NotebookLmAuthStatus(StrEnum):
    OK = "ok"
    PACKAGE_MISSING = "package_missing"
    MISSING_AUTH = "missing_auth"
    EXPIRED = "expired"
    NETWORK_ERROR = "network_error"
    STORAGE_ERROR = "storage_error"
    ERROR = "error"


@dataclass(frozen=True)
class NotebookLmAuthResult:
    status: NotebookLmAuthStatus
    message: str
    profile: str | None
    home: str | None = None
    detail: dict[str, Any] | None = None
    package_installed: bool = True
    authenticated: bool = False
    raw: dict[str, Any] | None = None


@dataclass(frozen=True)
class NotebookLmCommandResult:
    returncode: int
    stdout: str
    stderr: str


async def check_notebooklm_auth() -> NotebookLmAuthResult:
    if not _notebooklm_cli_available():
        return _result(
            status=NotebookLmAuthStatus.PACKAGE_MISSING,
            message="notebooklm-py is not installed.",
        )

    home_error = _prepare_notebooklm_home()
    if home_error:
        return home_error

    completed = await _run_notebooklm_command(*AUTH_CHECK_COMMAND[1:])
    payload = _parse_json_output(completed.stdout)
    if completed.returncode == 0 and _payload_status(payload) == "ok":
        return _result(
            status=NotebookLmAuthStatus.OK,
            authenticated=True,
            message=_success_message(payload),
            raw=payload,
        )
    status = _classify_auth_failure(completed.stderr, completed.stdout, payload)
    return _result(
        status=status,
        message=_failure_message(status, completed.stderr, completed.stdout, payload),
        raw=payload,
    )


async def login_notebooklm() -> NotebookLmAuthResult:
    current = await check_notebooklm_auth()
    if current.status in {
        NotebookLmAuthStatus.OK,
        NotebookLmAuthStatus.PACKAGE_MISSING,
        NotebookLmAuthStatus.STORAGE_ERROR,
    }:
        return current

    completed = await _run_notebooklm_command(*AUTH_LOGIN_COMMAND[1:], timeout=NOTEBOOKLM_AUTH_TIMEOUT_SECONDS)
    if completed.returncode != 0:
        status = _classify_auth_failure(completed.stderr, completed.stdout, None)
        return _result(
            status=status,
            message=_failure_message(status, completed.stderr, completed.stdout, None),
        )
    return await check_notebooklm_auth()


async def refresh_notebooklm_auth() -> NotebookLmAuthResult:
    if not _notebooklm_cli_available():
        return _result(
            status=NotebookLmAuthStatus.PACKAGE_MISSING,
            message="notebooklm-py is not installed.",
        )

    home_error = _prepare_notebooklm_home()
    if home_error:
        return home_error

    completed = await _run_notebooklm_command(*AUTH_REFRESH_COMMAND[1:])
    if completed.returncode != 0:
        status = _classify_auth_failure(completed.stderr, completed.stdout, None)
        return _result(
            status=status,
            message=_failure_message(status, completed.stderr, completed.stdout, None),
        )
    return await check_notebooklm_auth()


async def _run_notebooklm_command(
    *args: str,
    timeout: float = NOTEBOOKLM_AUTH_TIMEOUT_SECONDS,
) -> NotebookLmCommandResult:
    command = ["notebooklm", *args]

    try:
        process = await asyncio.create_subprocess_exec(
            *command,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            env=_notebooklm_env(),
        )
        stdout, stderr = await asyncio.wait_for(process.communicate(), timeout=timeout)
        return NotebookLmCommandResult(
            returncode=process.returncode or 0,
            stdout=stdout.decode("utf-8", errors="replace"),
            stderr=stderr.decode("utf-8", errors="replace"),
        )
    except (FileNotFoundError, TimeoutError) as exc:
        return NotebookLmCommandResult(
            returncode=1,
            stdout="",
            stderr=str(exc) or "notebooklm CLI is not available",
        )


def _notebooklm_cli_available() -> bool:
    return which("notebooklm") is not None


def _notebooklm_env() -> dict[str, str]:
    env = {key: value for key in SAFE_ENV_KEYS if (value := os.environ.get(key))}
    if settings.NOTEBOOKLM_HOME:
        env["NOTEBOOKLM_HOME"] = str(Path(settings.NOTEBOOKLM_HOME).expanduser())
    if settings.NOTEBOOKLM_PROFILE:
        env["NOTEBOOKLM_PROFILE"] = settings.NOTEBOOKLM_PROFILE
    return env


def _result(
    *,
    status: NotebookLmAuthStatus,
    message: str,
    authenticated: bool = False,
    raw: dict[str, Any] | None = None,
    detail: dict[str, Any] | None = None,
) -> NotebookLmAuthResult:
    return NotebookLmAuthResult(
        package_installed=status != NotebookLmAuthStatus.PACKAGE_MISSING,
        authenticated=authenticated,
        profile=settings.NOTEBOOKLM_PROFILE or "default",
        home=settings.NOTEBOOKLM_HOME,
        status=status,
        message=message,
        detail=detail if detail is not None else raw,
        raw=raw,
    )


def _prepare_notebooklm_home() -> NotebookLmAuthResult | None:
    configured_home = settings.NOTEBOOKLM_HOME
    if not configured_home:
        return None

    home_path = Path(configured_home).expanduser()
    detail = {"home": str(home_path)}
    if not home_path.is_absolute():
        return _storage_result(
            "NOTEBOOKLM_HOME must be an absolute path.",
            detail | {"reason": "relative_path"},
        )
    if home_path == Path(home_path.anchor):
        return _storage_result(
            "NOTEBOOKLM_HOME cannot point to the filesystem root.",
            detail | {"reason": "root_path"},
        )
    if home_path.exists() and not home_path.is_dir():
        return _storage_result(
            "NOTEBOOKLM_HOME points to a file, but NotebookLM needs a storage directory.",
            detail | {"reason": "not_directory"},
        )
    if not home_path.parent.is_dir():
        return _storage_result(
            "NotebookLM storage directory cannot be created because its parent directory does not exist.",
            detail | {"parent": str(home_path.parent), "reason": "missing_parent"},
        )

    try:
        home_path.mkdir(mode=0o700, exist_ok=True)
    except OSError as exc:
        return _storage_result(
            "NotebookLM storage directory is not writable or cannot be created.",
            detail | {"reason": exc.__class__.__name__, "error": str(exc)},
        )
    return None


def _storage_result(message: str, detail: dict[str, Any]) -> NotebookLmAuthResult:
    return _result(
        status=NotebookLmAuthStatus.STORAGE_ERROR,
        message=message,
        detail=detail,
    )


def _parse_json_output(output: str) -> dict[str, Any] | None:
    try:
        value = json.loads(output or "{}")
    except json.JSONDecodeError:
        return None
    return value if isinstance(value, dict) else None


def _payload_status(payload: dict[str, Any] | None) -> str:
    payload = payload or {}
    status = str(payload.get("status") or payload.get("auth_status") or "").casefold()
    if status:
        return status
    authenticated = payload.get("authenticated")
    if authenticated is True:
        return "ok"
    if authenticated is False:
        return "missing_auth"
    return ""


def _success_message(payload: dict[str, Any] | None) -> str:
    value = (payload or {}).get("message")
    return value if isinstance(value, str) and value.strip() else "Google NotebookLM authorization is valid."


def _classify_auth_failure(
    stderr: str,
    stdout: str,
    payload: dict[str, Any] | None,
) -> NotebookLmAuthStatus:
    text = f"{stderr}\n{stdout}\n{json.dumps(payload or {}, ensure_ascii=False)}".casefold()
    status = _payload_status(payload)
    if status in {"package_missing"} or "cli is not available" in text:
        return NotebookLmAuthStatus.PACKAGE_MISSING
    if _looks_like_storage_error(text):
        return NotebookLmAuthStatus.STORAGE_ERROR
    if status in {"expired", "unauthorized"} or any(item in text for item in ("expired", "unauthorized", "401")):
        return NotebookLmAuthStatus.EXPIRED
    if status in {"missing", "missing_auth", "not_authenticated", "not_logged_in"} or any(
        item in text for item in ("not authenticated", "not logged", "no cookies", "login required")
    ):
        return NotebookLmAuthStatus.MISSING_AUTH
    if status in {"network_error", "timeout", "connection_error"} or any(
        item in text for item in ("network", "timeout", "timed out", "connection", "dns", "502", "503", "504")
    ):
        return NotebookLmAuthStatus.NETWORK_ERROR
    return NotebookLmAuthStatus.ERROR


login_notebooklm_auth = login_notebooklm


def _looks_like_storage_error(text: str) -> bool:
    storage_markers = (
        "notebooklm_home",
        ".notebooklm",
        "storage",
        "mkdir",
        "makedirs",
        "no such file or directory",
        "permission denied",
        "not a directory",
        "file exists",
    )
    return any(marker in text for marker in storage_markers)


def _failure_message(
    status: NotebookLmAuthStatus,
    stderr: str,
    stdout: str,
    payload: dict[str, Any] | None,
) -> str:
    if status == NotebookLmAuthStatus.STORAGE_ERROR:
        return "NotebookLM storage directory is not available. Check NOTEBOOKLM_HOME on the server."
    for key in ("message", "error", "detail"):
        value = (payload or {}).get(key)
        if isinstance(value, str) and value.strip():
            return value.strip()
    return (stderr or stdout or "Google NotebookLM authorization check failed.").strip()[:1000]
