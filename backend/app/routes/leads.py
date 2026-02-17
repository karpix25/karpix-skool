
from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import Optional
from ..services.telegram import get_bot
from ..config import settings
import logging

router = APIRouter()

class LeadApply(BaseModel):
    name: str
    telegram: str
    schoolName: str
    description: str

async def send_lead_notification(lead: LeadApply):
    try:
        bot = await get_bot()
        admin_id = settings.SUPER_ADMIN_ID
        if not admin_id:
            logging.error("SUPER_ADMIN_ID not set, cannot send lead notification")
            return

        message = (
            "🚀 **НОВАЯ ЗАЯВКА НА ПЛАТФОРМУ**\n\n"
            f"👤 **Имя:** {lead.name}\n"
            f"📱 **Telegram:** {lead.telegram}\n"
            f"🏫 **Школа:** {lead.schoolName}\n\n"
            f"📝 **Описание:**\n{lead.description}\n\n"
            "💬 Свяжитесь с автором для обсуждения деталей."
        )

        await bot.send_message(
            chat_id=admin_id,
            text=message,
            parse_mode="Markdown"
        )
        logging.info(f"LEAD: Notification sent to admin {admin_id} for {lead.telegram}")
    except Exception as e:
        logging.error(f"Failed to send lead notification: {e}")

@router.post("/apply")
async def apply_lead(lead: LeadApply, background_tasks: BackgroundTasks):
    background_tasks.add_task(send_lead_notification, lead)
    return {"status": "success", "message": "Application received"}
