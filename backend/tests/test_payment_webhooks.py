import hashlib
import hmac

from app.services.payment_webhooks import verify_payment_signature


def test_verify_payment_signature_accepts_valid_signature():
    payload = b'{"order_id":"order_1"}'
    secret = "payment-secret"
    signature = hmac.new(secret.encode(), payload, hashlib.sha256).hexdigest()

    assert verify_payment_signature(payload, signature, secret) is True


def test_verify_payment_signature_rejects_invalid_signature():
    payload = b'{"order_id":"order_1"}'

    assert verify_payment_signature(payload, "bad-signature", "payment-secret") is False
