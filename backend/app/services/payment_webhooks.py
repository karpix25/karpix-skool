import hashlib
import hmac
from typing import Optional

from ..utils.cache import cache_redis


PAYMENT_IDEMPOTENCY_TTL_SECONDS = 60 * 60 * 24


def verify_payment_signature(payload: bytes, signature: Optional[str], secret: Optional[str]) -> bool:
    if not payload or not signature or not secret:
        return False

    expected_signature = hmac.new(
        secret.encode(),
        payload,
        hashlib.sha256,
    ).hexdigest()

    return hmac.compare_digest(expected_signature, signature)


async def mark_payment_order_processed(order_id: str) -> bool:
    redis_key = f"payment:webhook:processed:{order_id}"
    result = await cache_redis.set(
        redis_key,
        "1",
        ex=PAYMENT_IDEMPOTENCY_TTL_SECONDS,
        nx=True,
    )
    return bool(result)
