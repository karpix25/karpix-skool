import json
import stat

import pytest

from app.services import notebooklm_auth_storage
from app.services.notebooklm_auth_storage import (
    NotebookLmStorageImportError,
    import_notebooklm_storage_state,
)


def test_import_writes_profile_storage_state_atomically(monkeypatch, tmp_path):
    home = tmp_path / ".notebooklm"
    monkeypatch.setattr(notebooklm_auth_storage.settings, "NOTEBOOKLM_HOME", str(home))
    monkeypatch.setattr(notebooklm_auth_storage.settings, "NOTEBOOKLM_PROFILE", "standard")

    destination = import_notebooklm_storage_state(
        {
            "cookies": [
                {"name": "SID", "value": "secret", "domain": ".google.com"},
                {"name": "__Secure-1PSIDTS", "value": "secret", "domain": ".google.com"},
            ]
        }
    )

    assert destination == home / "profiles" / "standard" / "storage_state.json"
    assert json.loads(destination.read_text())["cookies"][0]["name"] == "SID"
    assert stat.S_IMODE(destination.stat().st_mode) == 0o600
    assert stat.S_IMODE(destination.parent.stat().st_mode) == 0o700


@pytest.mark.parametrize(
    "payload",
    [{}, {"cookies": []}, {"cookies": "invalid"}, {"cookies": [{"name": "SID"}]}],
)
def test_import_rejects_invalid_storage_state(monkeypatch, tmp_path, payload):
    monkeypatch.setattr(notebooklm_auth_storage.settings, "NOTEBOOKLM_HOME", str(tmp_path))

    with pytest.raises(NotebookLmStorageImportError):
        import_notebooklm_storage_state(payload)


def test_import_requires_configured_home(monkeypatch):
    monkeypatch.setattr(notebooklm_auth_storage.settings, "NOTEBOOKLM_HOME", None)

    with pytest.raises(NotebookLmStorageImportError, match="NOTEBOOKLM_HOME"):
        import_notebooklm_storage_state(
            {"cookies": [{"name": "SID"}, {"name": "__Secure-1PSIDTS"}]}
        )


def test_import_rejects_oversized_storage_state(monkeypatch, tmp_path):
    monkeypatch.setattr(notebooklm_auth_storage.settings, "NOTEBOOKLM_HOME", str(tmp_path))
    payload = {
        "cookies": [
            {"name": "SID", "value": "secret"},
            {"name": "__Secure-1PSIDTS", "value": "x" * 1_000_000},
        ]
    }

    with pytest.raises(NotebookLmStorageImportError, match="размер"):
        import_notebooklm_storage_state(payload)
