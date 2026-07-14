import json

from fastapi import APIRouter, Depends, HTTPException, Header, Request
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from ..db import get_session
from ..config import settings
from ..services.payment_webhooks import (
    get_payment_event_id,
    mark_payment_event_processed,
    mark_payment_order_processed,
    verify_payment_signature,
)
from ..utils.logging_config import logger

router = APIRouter(tags=["Payments"])

@router.post("/webhook/crypto")
async def crypto_payment_webhook(
    request: Request,
    x_signature: Optional[str] = Header(None),
    x_timestamp: Optional[str] = Header(None),
    x_webhook_id: Optional[str] = Header(None),
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

    if not settings.PAYMENT_WEBHOOK_SECRET:
        logger.error("PAYMENT WEBHOOK: PAYMENT_WEBHOOK_SECRET is not configured")
        raise HTTPException(status_code=500, detail="Webhook secret is not configured")

    payload = await request.body()
    if not verify_payment_signature(
        payload,
        x_signature,
        settings.PAYMENT_WEBHOOK_SECRET,
        timestamp=x_timestamp,
    ):
        logger.error("PAYMENT WEBHOOK: Invalid cryptographic signature detected!")
        raise HTTPException(status_code=403, detail="Invalid signature")

    try:
        data = json.loads(payload)
        if not isinstance(data, dict):
            raise HTTPException(status_code=400, detail="Invalid payload")

        order_id = str(data.get("order_id") or "").strip()
        if not order_id:
            raise HTTPException(status_code=400, detail="Missing order_id")
        if len(order_id) > 128:
            raise HTTPException(status_code=400, detail="Invalid order_id")

        if not settings.PAYMENT_AUTOMATION_ENABLED:
            logger.warning(
                "PAYMENT WEBHOOK: Automated payment activation is disabled; "
                "use audited manual subscription activation"
            )
            raise HTTPException(
                status_code=503,
                detail="Automated payments are not enabled",
            )

        event_id = get_payment_event_id(data, x_webhook_id)
        if event_id and not await mark_payment_event_processed(event_id):
            logger.info(f"PAYMENT WEBHOOK: Ignoring duplicate event {event_id}")
            return {"status": "already_processed"}

        if not await mark_payment_order_processed(order_id):
            logger.info(f"PAYMENT WEBHOOK: Ignoring duplicate order {order_id}")
            return {"status": "already_processed"}

        # Business Logic Here (e.g. Update Tenant Status, Grant Access)
        logger.info(f"PAYMENT WEBHOOK: Successfully processed payment for order {order_id}")

        return {"status": "success"}

    except HTTPException:
        raise
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON payload")
    except Exception as e:
        logger.error(f"PAYMENT WEBHOOK ERROR: {e}")
        raise HTTPException(status_code=500, detail="Internal processing error")
