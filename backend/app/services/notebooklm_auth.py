import asyncio
import json
import os
from dataclasses import dataclass
from enum import StrEnum
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

    completed = await _run_notebooklm_command(*AUTH_CHECK_COMMAND[1:])
    payload = _parse_json_output(completed.stdout)
    if completed.returncode == 0 and _payload_status(payload) == "ok":
        return _result(
            status=NotebookLmAuthStatus.OK,
            authenticated=True,
            message=_success_message(payload),
            raw=payload,
        )
    return _result(
        status=_classify_auth_failure(completed.stderr, completed.stdout, payload),
        message=_failure_message(completed.stderr, completed.stdout, payload),
        raw=payload,
    )


async def login_notebooklm() -> NotebookLmAuthResult:
    current = await check_notebooklm_auth()
    if current.status in {NotebookLmAuthStatus.OK, NotebookLmAuthStatus.PACKAGE_MISSING}:
        return current

    completed = await _run_notebooklm_command(*AUTH_LOGIN_COMMAND[1:], timeout=NOTEBOOKLM_AUTH_TIMEOUT_SECONDS)
    if completed.returncode != 0:
        return _result(
            status=_classify_auth_failure(completed.stderr, completed.stdout, None),
            message=_failure_message(completed.stderr, completed.stdout, None),
        )
    return await check_notebooklm_auth()


async def refresh_notebooklm_auth() -> NotebookLmAuthResult:
    if not _notebooklm_cli_available():
        return _result(
            status=NotebookLmAuthStatus.PACKAGE_MISSING,
            message="notebooklm-py is not installed.",
        )

    completed = await _run_notebooklm_command(*AUTH_REFRESH_COMMAND[1:])
    if completed.returncode != 0:
        return _result(
            status=_classify_auth_failure(completed.stderr, completed.stdout, None),
            message=_failure_message(completed.stderr, completed.stdout, None),
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
        env["NOTEBOOKLM_HOME"] = settings.NOTEBOOKLM_HOME
    if settings.NOTEBOOKLM_PROFILE:
        env["NOTEBOOKLM_PROFILE"] = settings.NOTEBOOKLM_PROFILE
    return env


def _result(
    *,
    status: NotebookLmAuthStatus,
    message: str,
    authenticated: bool = False,
    raw: dict[str, Any] | None = None,
) -> NotebookLmAuthResult:
    return NotebookLmAuthResult(
        package_installed=status != NotebookLmAuthStatus.PACKAGE_MISSING,
        authenticated=authenticated,
        profile=settings.NOTEBOOKLM_PROFILE or "default",
        home=settings.NOTEBOOKLM_HOME,
        status=status,
        message=message,
        detail=raw,
        raw=raw,
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


def _failure_message(
    stderr: str,
    stdout: str,
    payload: dict[str, Any] | None,
) -> str:
    for key in ("message", "error", "detail"):
        value = (payload or {}).get(key)
        if isinstance(value, str) and value.strip():
            return value.strip()
    return (stderr or stdout or "Google NotebookLM authorization check failed.").strip()[:1000]
