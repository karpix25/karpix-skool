import json
import os
import tempfile
from pathlib import Path
from typing import Any

from filelock import FileLock, Timeout

from ..config import settings
from .notebooklm_home import NotebookLmHomeError, prepare_notebooklm_home


MAX_STORAGE_STATE_BYTES = 1_000_000
REQUIRED_COOKIE_NAMES = {"SID", "__Secure-1PSIDTS"}


class NotebookLmStorageImportError(ValueError):
    pass


def import_notebooklm_storage_state(storage_state: dict[str, Any]) -> Path:
    payload = _validated_payload(storage_state)
    destination = _storage_state_path()
    destination.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    destination.parent.chmod(0o700)

    try:
        with FileLock(str(_storage_lock_path(destination)), timeout=10):
            _atomic_write(destination, payload)
    except Timeout as exc:
        raise NotebookLmStorageImportError(
            "Профиль NotebookLM сейчас используется. Повторите загрузку через несколько секунд."
        ) from exc

    return destination


def bootstrap_notebooklm_storage_state(raw_storage_state: str | None) -> bool:
    if not raw_storage_state:
        return False
    destination = _storage_state_path()
    if destination.is_file():
        return False
    try:
        storage_state = json.loads(raw_storage_state)
    except json.JSONDecodeError as exc:
        raise NotebookLmStorageImportError(
            "NOTEBOOKLM_BOOTSTRAP_AUTH_JSON содержит некорректный JSON."
        ) from exc
    if not isinstance(storage_state, dict):
        raise NotebookLmStorageImportError(
            "NOTEBOOKLM_BOOTSTRAP_AUTH_JSON должен содержать JSON-объект."
        )
    import_notebooklm_storage_state(storage_state)
    return True


def _validated_payload(storage_state: dict[str, Any]) -> str:
    cookies = storage_state.get("cookies")
    if not isinstance(cookies, list) or not cookies:
        raise NotebookLmStorageImportError(
            "Файл авторизации должен содержать непустой список cookies."
        )
    cookie_names = {
        cookie.get("name")
        for cookie in cookies
        if isinstance(cookie, dict) and isinstance(cookie.get("name"), str)
    }
    missing_cookie_names = REQUIRED_COOKIE_NAMES - cookie_names
    if missing_cookie_names:
        missing = ", ".join(sorted(missing_cookie_names))
        raise NotebookLmStorageImportError(
            f"В файле отсутствуют обязательные Google cookies: {missing}."
        )

    payload = json.dumps(storage_state, ensure_ascii=False, separators=(",", ":"))
    if len(payload.encode("utf-8")) > MAX_STORAGE_STATE_BYTES:
        raise NotebookLmStorageImportError("Файл авторизации превышает допустимый размер.")
    return payload


def _storage_state_path() -> Path:
    home = settings.NOTEBOOKLM_HOME
    if not home:
        raise NotebookLmStorageImportError("NOTEBOOKLM_HOME не настроен на сервере.")

    profile = settings.NOTEBOOKLM_PROFILE or "default"
    if not profile.replace("-", "").replace("_", "").isalnum():
        raise NotebookLmStorageImportError("Имя профиля NotebookLM некорректно.")

    try:
        home_path = prepare_notebooklm_home(home)
    except NotebookLmHomeError as exc:
        raise NotebookLmStorageImportError(exc.message) from exc
    return home_path / "profiles" / profile / "storage_state.json"


def _storage_lock_path(destination: Path) -> Path:
    return destination.with_name(f".{destination.name}.lock")


def _atomic_write(destination: Path, payload: str) -> None:
    fd, temporary_path = tempfile.mkstemp(
        dir=destination.parent,
        prefix=".storage_state.",
        suffix=".tmp",
    )
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as file:
            file.write(payload)
            file.flush()
            os.fsync(file.fileno())
        os.chmod(temporary_path, 0o600)
        os.replace(temporary_path, destination)
    finally:
        if os.path.exists(temporary_path):
            os.unlink(temporary_path)
