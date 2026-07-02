from app.services.telegram_messages import TELEGRAM_MARKDOWN_V2
from app.utils.telegram_markdown import escape_markdown_v2, markdown_v2_bold

LEARNING_REPLY_PARSE_MODE = TELEGRAM_MARKDOWN_V2


def start_reply(tenant_name: str | None) -> str:
    display_name = tenant_name or "Школу"
    return (
        f"👋 {markdown_v2_bold(f'Добро пожаловать в {display_name}!')}\n\n"
        f"{escape_markdown_v2('Готовы начать обучение? Нажмите кнопку ниже, чтобы открыть дашборд! 🚀')}"
    )


def courses_reply(tenant_name: str) -> str:
    return (
        f"📖 {markdown_v2_bold(f'Курсы школы: {tenant_name}')}\n\n"
        f"{escape_markdown_v2('Нажмите кнопку ниже, чтобы перейти к обучению! 👇')}"
    )


def leaderboard_reply(tenant_name: str, members) -> str:
    lines = [f"🏆 {markdown_v2_bold(f'Таблица лидеров: {tenant_name}')}", ""]
    for index, member in enumerate(members, 1):
        username = member.user.username or "Аноним"
        lines.append(escape_markdown_v2(f"{index}. {username} — ⭐️ {member.xp} XP (Ур. {member.level})"))
    return "\n".join(lines) + "\n"
