from fastapi import APIRouter, BackgroundTasks, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from ..db import get_session
from ..services.telegram import get_bot
from ..services.lead_notifications import build_lead_notification_message
from ..services.platform_leads import create_platform_lead
from ..schemas.platform_leads import LeadApply, LeadApplyResponse
from ..config import settings
import logging

router = APIRouter()

async def send_lead_notification(lead: LeadApply):
    bot = None
    try:
        admin_id = settings.SUPER_ADMIN_ID
        if not admin_id:
            logging.error("SUPER_ADMIN_ID not set, cannot send lead notification")
            return

        bot = await get_bot()
        await bot.send_message(
            chat_id=admin_id,
            text=build_lead_notification_message(lead),
            parse_mode="MarkdownV2",
        )
        logging.info(f"LEAD: Notification sent to admin {admin_id} for {lead.telegram}")
    except Exception as e:
        logging.error(f"Failed to send lead notification: {e}")
    finally:
        if bot:
            await bot.session.close()

@router.post("/apply", response_model=LeadApplyResponse)
async def apply_lead(
    lead: LeadApply,
    background_tasks: BackgroundTasks,
    session: AsyncSession = Depends(get_session),
):
    saved_lead = await create_platform_lead(session, lead)
    background_tasks.add_task(send_lead_notification, lead)
    return {"status": "success", "message": "Application received", "id": saved_lead.id}
