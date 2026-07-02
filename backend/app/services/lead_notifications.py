from typing import Protocol

from app.utils.telegram_markdown import escape_markdown_v2


class LeadNotificationData(Protocol):
    name: str
    telegram: str
    schoolName: str
    description: str


def build_lead_notification_message(lead: LeadNotificationData) -> str:
    return (
        "🚀 *НОВАЯ ЗАЯВКА НА ПЛАТФОРМУ*\n\n"
        f"👤 *Имя:* {escape_markdown_v2(lead.name)}\n"
        f"📱 *Telegram:* {escape_markdown_v2(lead.telegram)}\n"
        f"🏫 *Школа:* {escape_markdown_v2(lead.schoolName)}\n\n"
        f"📝 *Описание:*\n{escape_markdown_v2(lead.description)}\n\n"
        "💬 Свяжитесь с автором для обсуждения деталей"
    )
