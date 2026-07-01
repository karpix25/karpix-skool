import hashlib
import hmac
import time
from typing import Optional


SIGNATURE_TOLERANCE_SECONDS = 300


def _parse_mux_signature(signature_header: str) -> tuple[Optional[int], list[str]]:
    timestamp = None
    signatures: list[str] = []

    for item in signature_header.split(","):
        key, _, value = item.partition("=")
        if key == "t":
            try:
                timestamp = int(value)
            except ValueError:
                timestamp = None
        elif key == "v1" and value:
            signatures.append(value)

    return timestamp, signatures


def build_mux_signature(payload: bytes, secret: str, timestamp: Optional[int] = None) -> str:
    event_timestamp = int(time.time()) if timestamp is None else timestamp
    signed_payload = f"{event_timestamp}.".encode() + payload
    digest = hmac.new(secret.encode(), signed_payload, hashlib.sha256).hexdigest()
    return f"t={event_timestamp},v1={digest}"


def verify_mux_signature(
    payload: bytes,
    signature_header: Optional[str],
    secret: Optional[str],
    now: Optional[int] = None,
) -> bool:
    if not payload or not signature_header or not secret:
        return False

    timestamp, signatures = _parse_mux_signature(signature_header)
    if timestamp is None or not signatures:
        return False

    current_time = int(time.time()) if now is None else now
    if abs(current_time - timestamp) > SIGNATURE_TOLERANCE_SECONDS:
        return False

    expected_signature = build_mux_signature(payload, secret, timestamp).split("v1=", 1)[1]
    return any(hmac.compare_digest(expected_signature, signature) for signature in signatures)
