import re

from app.services import setup_codes


def test_generate_setup_code_uses_secrets_token_urlsafe(monkeypatch):
    calls = []

    def fake_token_urlsafe(nbytes):
        calls.append(nbytes)
        return "secure-token"

    monkeypatch.setattr(setup_codes.secrets, "token_urlsafe", fake_token_urlsafe)

    assert setup_codes.generate_setup_code() == "START-secure-token"
    assert calls == [setup_codes.SETUP_CODE_RANDOM_BYTES]


def test_generate_setup_code_is_long_urlsafe_token():
    code = setup_codes.generate_setup_code()

    assert code.startswith("START-")
    assert len(code) >= 30
    assert re.fullmatch(r"START-[A-Za-z0-9_-]+", code)
