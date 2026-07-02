import hashlib
import hmac
import time

import pytest
from fastapi import HTTPException

from app.routes import payments
from app.services.payment_webhooks import build_payment_signature, verify_payment_signature


def test_verify_payment_signature_accepts_valid_signature():
    payload = b'{"order_id":"order_1"}'
    secret = "payment-secret"
    signature = hmac.new(secret.encode(), payload, hashlib.sha256).hexdigest()

    assert verify_payment_signature(payload, signature, secret) is True


def test_verify_payment_signature_rejects_invalid_signature():
    payload = b'{"order_id":"order_1"}'

    assert verify_payment_signature(payload, "bad-signature", "payment-secret") is False


def test_verify_payment_signature_accepts_timestamped_signature():
    payload = b'{"order_id":"order_1"}'
    secret = "payment-secret"
    timestamp = str(int(time.time()))
    signature = build_payment_signature(payload, secret, timestamp)

    assert verify_payment_signature(
        payload,
        signature,
        secret,
        timestamp=timestamp,
        now=int(timestamp),
    ) is True


def test_verify_payment_signature_rejects_legacy_signature_when_timestamp_is_present():
    payload = b'{"order_id":"order_1"}'
    secret = "payment-secret"
    timestamp = str(int(time.time()))
    legacy_signature = build_payment_signature(payload, secret)

    assert verify_payment_signature(
        payload,
        legacy_signature,
        secret,
        timestamp=timestamp,
        now=int(timestamp),
    ) is False


def test_verify_payment_signature_rejects_expired_timestamp():
    payload = b'{"order_id":"order_1"}'
    secret = "payment-secret"
    timestamp = str(int(time.time()) - 301)
    signature = build_payment_signature(payload, secret, timestamp)

    assert verify_payment_signature(
        payload,
        signature,
        secret,
        timestamp=timestamp,
        now=int(time.time()),
    ) is False


class FakeRequest:
    def __init__(self, payload: bytes):
        self.payload = payload

    async def body(self):
        return self.payload


@pytest.mark.asyncio
async def test_crypto_payment_webhook_preserves_expected_http_exception(monkeypatch):
    payload = b'{"amount":100}'
    secret = "payment-secret"
    signature = hmac.new(secret.encode(), payload, hashlib.sha256).hexdigest()
    monkeypatch.setattr(payments.settings, "PAYMENT_WEBHOOK_SECRET", secret)

    with pytest.raises(HTTPException) as exc_info:
        await payments.crypto_payment_webhook(
            FakeRequest(payload),
            x_signature=signature,
            x_timestamp=None,
            x_webhook_id=None,
            session=None,
        )

    assert exc_info.value.status_code == 400
