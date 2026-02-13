from fastapi import APIRouter, Depends, HTTPException, Header, Request
from sqlmodel import select
from sqlalchemy.ext.asyncio import AsyncSession
import hmac
import hashlib
import time
from typing import Optional
from ..db import get_session
from ..config import settings
from ..utils.logging_config import logger

router = APIRouter(tags=["Payments"])

# In a real app, this would be a more robust persistent store (e.g. Redis)
# To handle idempotency across instances. For now, we'll demonstrate the logic.
PROCESSED_ORDERS = set()

def verify_webhook_signature(payload: bytes, signature: str, secret: str) -> bool:
    """
    Standard HMAC-SHA256 signature verification.
    """
    if not secret:
        return False
    
    expected_signature = hmac.new(
        secret.encode(),
        payload,
        hashlib.sha256
    ).hexdigest()
    
    return hmac.compare_digest(expected_signature, signature)

@router.post("/webhook/crypto")
async def crypto_payment_webhook(
    request: Request,
    x_signature: Optional[str] = Header(None),
    session: AsyncSession = Depends(get_session)
):
    """
    Skeletal Payment Webhook demonstrating Security Best Practices:
    1. Cryptographic Signature Verification
    2. Idempotency (Order ID Tracking)
    3. Error Logging & Observability
    """
    if not x_signature:
        logger.warning("PAYMENT WEBHOOK: Missing signature header")
        raise HTTPException(status_code=401, detail="Missing signature")

    payload = await request.body()
    
    # We use a PLACEHOLDER secret from settings
    # In production, this would be CRYPTO_WEBHOOK_SECRET
    webhook_secret = getattr(settings, "PAYMENT_WEBHOOK_SECRET", "change_me_in_production")

    if not verify_webhook_signature(payload, x_signature, webhook_secret):
        logger.error("PAYMENT WEBHOOK: Invalid cryptographic signature detected!")
        raise HTTPException(status_code=403, detail="Invalid signature")

    try:
        data = await request.json()
        order_id = data.get("order_id")
        
        if not order_id:
            raise HTTPException(status_code=400, detail="Missing order_id")

        # Idempotency Check
        if order_id in PROCESSED_ORDERS:
            logger.info(f"PAYMENT WEBHOOK: Ignoring duplicate order {order_id}")
            return {"status": "already_processed"}

        # Business Logic Here (e.g. Update Tenant Status, Grant Access)
        logger.info(f"PAYMENT WEBHOOK: Successfully processed payment for order {order_id}")
        
        PROCESSED_ORDERS.add(order_id)
        
        return {"status": "success"}

    except Exception as e:
        logger.error(f"PAYMENT WEBHOOK ERROR: {e}")
        raise HTTPException(status_code=500, detail="Internal processing error")
