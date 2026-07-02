import hashlib
import hmac
import time
from collections.abc import Mapping
from typing import Optional

from ..utils.cache import cache_redis


PAYMENT_IDEMPOTENCY_TTL_SECONDS = 60 * 60 * 24
PAYMENT_SIGNATURE_TOLERANCE_SECONDS = 5 * 60


def build_payment_signature(
    payload: bytes,
    secret: str,
    timestamp: Optional[str] = None,
) -> str:
    signed_payload = payload if timestamp is None else f"{timestamp}.".encode() + payload
    return hmac.new(
        secret.encode(),
        signed_payload,
        hashlib.sha256,
    ).hexdigest()


def verify_payment_signature(
    payload: bytes,
    signature: Optional[str],
    secret: Optional[str],
    *,
    timestamp: Optional[str] = None,
    now: Optional[int] = None,
) -> bool:
    if not payload or not signature or not secret:
        return False

    if timestamp is not None:
        if not _timestamp_is_fresh(timestamp, now=now):
            return False
        return hmac.compare_digest(build_payment_signature(payload, secret, timestamp), signature)

    return hmac.compare_digest(build_payment_signature(payload, secret), signature)


def get_payment_event_id(data: Mapping[str, object], header_event_id: Optional[str]) -> Optional[str]:
    for value in (header_event_id, data.get("webhook_id"), data.get("event_id"), data.get("id")):
        if value:
            event_id = str(value).strip()
            if event_id:
                return event_id[:128]
    return None


async def mark_payment_order_processed(order_id: str) -> bool:
    return await _set_payment_key(f"payment:webhook:processed:{order_id}")


async def mark_payment_event_processed(event_id: str) -> bool:
    return await _mark_payment_key_processed("event", event_id)


async def _mark_payment_key_processed(kind: str, value: str) -> bool:
    redis_key = f"payment:webhook:processed:{kind}:{_stable_key_token(value)}"
    return await _set_payment_key(redis_key)


async def _set_payment_key(redis_key: str) -> bool:
    result = await cache_redis.set(
        redis_key,
        "1",
        ex=PAYMENT_IDEMPOTENCY_TTL_SECONDS,
        nx=True,
    )
    return bool(result)


def _stable_key_token(value: str) -> str:
    return hashlib.sha256(value.encode()).hexdigest()


def _timestamp_is_fresh(timestamp: str, *, now: Optional[int] = None) -> bool:
    try:
        webhook_time = int(timestamp)
    except (TypeError, ValueError):
        return False

    current_time = int(time.time()) if now is None else now
    return abs(current_time - webhook_time) <= PAYMENT_SIGNATURE_TOLERANCE_SECONDS
