from app.services.telegram_messages import TELEGRAM_MARKDOWN_V2
from app.services.telegram_setup_auth import SetupAuthFailure
from app.utils.telegram_markdown import escape_markdown_v2, markdown_v2_bold

SETUP_REPLY_PARSE_MODE = TELEGRAM_MARKDOWN_V2


def sender_required_reply() -> str:
    return (
        f"⚠️ {markdown_v2_bold('Ошибка:')} "
        f"{escape_markdown_v2('Не могу подтвердить личность отправителя.')}\n\n"
        f"{escape_markdown_v2('Отключите анонимное администрирование и отправьте команду снова от своего Telegram-аккаунта.')}"
    )


def group_auth_failure_reply(failure: SetupAuthFailure | None) -> str:
    if failure == SetupAuthFailure.not_group_admin:
        return (
            f"{escape_markdown_v2('❌ Привязать группу может только Telegram owner/admin этой группы.')}\n\n"
            f"{escape_markdown_v2('Попросите администратора группы отправить команду ещё раз.')}"
        )

    return (
        f"{escape_markdown_v2('❌ Этот Telegram-аккаунт не является owner/admin выбранной школы.')}\n\n"
        f"{escape_markdown_v2('Сначала владелец школы должен открыть бота в личных сообщениях и отправить /setup <ваш_код>, ')}"
        f"{escape_markdown_v2('а затем повторить команду в группе.')}"
    )


def tenant_auth_required_reply() -> str:
    return (
        f"{escape_markdown_v2('❌ Этот Telegram-аккаунт не является owner/admin выбранной школы.')}\n\n"
        f"{escape_markdown_v2('Войдите в аккаунт владельца или администратора школы и повторите команду.')}"
    )


def private_setup_reply(tenant_name: str, group_type: str, is_vip_setup: bool, owner_assigned: bool) -> str:
    heading = (
        f"✅ {markdown_v2_bold('Владелец подтвержден!')} {escape_markdown_v2('Теперь вы — хозяин школы')}"
        if owner_assigned
        else f"✅ {markdown_v2_bold('Доступ подтвержден!')} {escape_markdown_v2('Школа')}"
    )
    setup_command = f"/setup <code>{' vip' if is_vip_setup else ''}"

    return (
        f"{heading} {markdown_v2_bold(tenant_name)}{escape_markdown_v2('.')}\n\n"
        f"{escape_markdown_v2('Теперь добавьте меня в вашу')} {markdown_v2_bold(group_type)} "
        f"{escape_markdown_v2('группу Telegram и отправьте там ту же команду ')}"
        f"{escape_markdown_v2(setup_command)}"
        f"{escape_markdown_v2(', чтобы я связал курсы с группой.')}"
    )


def group_setup_reply(
    tenant_name: str,
    group_type: str,
    topic_id: int | None,
    owner_assigned: bool,
    admin_name: str | None,
    bot_username: str | None,
) -> str:
    reply = (
        f"✅ {markdown_v2_bold('СВЯЗАНО!')} {escape_markdown_v2('Эта группа теперь является')} "
        f"{markdown_v2_bold(group_type)} {escape_markdown_v2('классом для:')} "
        f"{markdown_v2_bold(tenant_name)}"
    )
    if topic_id:
        reply += f"\n📌 {markdown_v2_bold('Тема привязана:')} ID {escape_markdown_v2(topic_id)}"
    if owner_assigned:
        reply += (
            f"\n\n👤 {markdown_v2_bold('Администратор назначен:')} "
            f"{escape_markdown_v2(admin_name or 'unknown')}{escape_markdown_v2('.')}"
        )
        if bot_username:
            reply += (
                f" {escape_markdown_v2('Теперь вы можете управлять школой в Админ-панели: ')}"
                f"{escape_markdown_v2(f'https://t.me/{bot_username}/admin')}"
            )
    return reply
