from typing import Optional

from app.utils.telegram_markdown import escape_markdown_v2, markdown_v2_bold


TELEGRAM_MARKDOWN_V2 = "MarkdownV2"


def build_course_announcement_caption(
    course_title: str,
    course_description: Optional[str],
    custom_text: Optional[str],
) -> str:
    body = custom_text or course_description or ""
    return "\n".join(
        [
            f"🚀 {markdown_v2_bold(f'НОВЫЙ КУРС: {course_title}')}",
            "",
            escape_markdown_v2(body),
            "",
            escape_markdown_v2("👇 Присоединяйся к обучению прямо сейчас!"),
        ]
    )


def build_level_up_message(level: int) -> str:
    return (
        f"🎉 {markdown_v2_bold('УРОВЕНЬ ВВЕРХ!')}\n\n"
        f"{escape_markdown_v2('Поздравляем! Ты достиг ')}"
        f"{markdown_v2_bold(f'Уровня {level}')}"
        f"{escape_markdown_v2('! Продолжай в том же духе! 🚀')}"
    )


def build_admin_request_notification_message(
    username: Optional[str],
    telegram_id: Optional[int],
    school_name: Optional[str],
    details: Optional[str],
) -> str:
    display_username = username or "unknown"
    display_telegram_id = telegram_id if telegram_id is not None else "unknown"
    display_school = school_name or "Не указано"
    display_details = details or "Не указано"

    return (
        f"🔔 {markdown_v2_bold('Новая заявка на доступ!')}\n\n"
        f"👤 {markdown_v2_bold('Юзер:')} @{escape_markdown_v2(display_username)} "
        f"{escape_markdown_v2(f'(ID: {display_telegram_id})')}\n"
        f"🏫 {markdown_v2_bold('Школа:')} {escape_markdown_v2(display_school)}\n"
        f"📝 {markdown_v2_bold('Инфо:')} {escape_markdown_v2(display_details)}\n"
    )
