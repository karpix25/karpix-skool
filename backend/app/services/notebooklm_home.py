from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class NotebookLmHomeError(ValueError):
    message: str
    detail: dict[str, str]


def prepare_notebooklm_home(configured_home: str) -> Path:
    home_path = Path(configured_home).expanduser()
    detail = {"home": str(home_path)}
    if not home_path.is_absolute():
        raise NotebookLmHomeError(
            "NOTEBOOKLM_HOME must be an absolute path.",
            detail | {"reason": "relative_path"},
        )
    if home_path == Path(home_path.anchor):
        raise NotebookLmHomeError(
            "NOTEBOOKLM_HOME cannot point to the filesystem root.",
            detail | {"reason": "root_path"},
        )
    if home_path.exists() and not home_path.is_dir():
        raise NotebookLmHomeError(
            "NOTEBOOKLM_HOME points to a file, but NotebookLM needs a storage directory.",
            detail | {"reason": "not_directory"},
        )
    if not home_path.parent.is_dir():
        raise NotebookLmHomeError(
            "NotebookLM storage directory cannot be created because its parent directory does not exist.",
            detail | {"parent": str(home_path.parent), "reason": "missing_parent"},
        )

    try:
        home_path.mkdir(mode=0o700, exist_ok=True)
        home_path.chmod(0o700)
    except OSError as exc:
        raise NotebookLmHomeError(
            "NotebookLM storage directory is not writable or cannot be created.",
            detail | {"reason": exc.__class__.__name__, "error": str(exc)},
        ) from exc
    return home_path.resolve()
