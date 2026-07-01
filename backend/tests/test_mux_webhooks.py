import time

from app.services.mux_webhooks import build_mux_signature, verify_mux_signature


def test_verify_mux_signature_accepts_valid_signature():
    payload = b'{"type":"video.asset.ready"}'
    secret = "mux-secret"
    timestamp = int(time.time())
    signature = build_mux_signature(payload, secret, timestamp)

    assert verify_mux_signature(payload, signature, secret, now=timestamp) is True


def test_verify_mux_signature_rejects_invalid_signature():
    payload = b'{"type":"video.asset.ready"}'
    secret = "mux-secret"
    timestamp = int(time.time())
    signature = build_mux_signature(payload, "wrong-secret", timestamp)

    assert verify_mux_signature(payload, signature, secret, now=timestamp) is False


def test_verify_mux_signature_rejects_expired_timestamp():
    payload = b'{"type":"video.asset.ready"}'
    secret = "mux-secret"
    timestamp = int(time.time()) - 301
    signature = build_mux_signature(payload, secret, timestamp)

    assert verify_mux_signature(payload, signature, secret, now=int(time.time())) is False
