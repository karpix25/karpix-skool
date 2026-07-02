
from fastapi import APIRouter, BackgroundTasks
from pydantic import BaseModel, Field
from ..services.telegram import get_bot
from ..services.lead_notifications import build_lead_notification_message
from ..config import settings
import logging

router = APIRouter()

class LeadApply(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    telegram: str = Field(min_length=1, max_length=80)
    schoolName: str = Field(min_length=1, max_length=160)
    description: str = Field(min_length=1, max_length=2000)

async def send_lead_notification(lead: LeadApply):
    try:
        bot = await get_bot()
        admin_id = settings.SUPER_ADMIN_ID
        if not admin_id:
            logging.error("SUPER_ADMIN_ID not set, cannot send lead notification")
            return

        await bot.send_message(
            chat_id=admin_id,
            text=build_lead_notification_message(lead),
            parse_mode="MarkdownV2",
        )
        logging.info(f"LEAD: Notification sent to admin {admin_id} for {lead.telegram}")
    except Exception as e:
        logging.error(f"Failed to send lead notification: {e}")

@router.post("/apply")
async def apply_lead(lead: LeadApply, background_tasks: BackgroundTasks):
    background_tasks.add_task(send_lead_notification, lead)
    return {"status": "success", "message": "Application received"}
