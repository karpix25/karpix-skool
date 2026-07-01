import logging

from aiogram import Router
from aiogram.filters import Command
from aiogram.types import Message
from sqlalchemy.future import select

from app.models import Tenant, User
from app.services.telegram import sync_group_admins

router = Router()


@router.message(Command("setup"))
async def cmd_setup(message: Message, db, tenant: Tenant | None = None):
    if tenant:
        await message.reply(f"✅ Эта группа уже подключена к: {tenant.name}")
        return

    args = message.text.split()
    if len(args) < 2:
        await message.reply("⚠️ Использование: `/setup <CONNECT_CODE>` (для обычной группы) или `/setup <CONNECT_CODE> vip` (для VIP группы)")
        return

    connect_code = args[1]
    is_vip_setup = len(args) >= 3 and args[2].lower() == "vip"
    stmt = select(Tenant).where(Tenant.setup_code == connect_code)
    result = await db.execute(stmt)
    target_tenant = result.scalars().first()

    if not target_tenant:
        await message.reply("❌ Неверный код. Проверьте его в админ-панели.")
        return

    if is_vip_setup and target_tenant.telegram_group_id_vip:
        await message.reply(f"⚠️ Эта школа уже подключена к VIP-группе (ID: {target_tenant.telegram_group_id_vip}).")
        return
    if not is_vip_setup and target_tenant.telegram_group_id:
        await message.reply(f"⚠️ Эта школа уже подключена к обычной группе (ID: {target_tenant.telegram_group_id}).")
        return

    is_private = message.chat.type == "private"
    if not is_private:
        topic_id = message.message_thread_id if message.is_topic_message else None
        logging.info("SETUP: Captured Chat ID %s, Topic ID %s (VIP=%s)", message.chat.id, topic_id, is_vip_setup)
        if is_vip_setup:
            target_tenant.telegram_group_id_vip = message.chat.id
            target_tenant.telegram_topic_id_vip = topic_id
        else:
            target_tenant.telegram_group_id = message.chat.id
            target_tenant.telegram_topic_id = topic_id

    owner_assigned = await _ensure_owner(message, db, target_tenant, is_private)
    if owner_assigned is None:
        return

    db.add(target_tenant)
    await db.commit()
    await db.refresh(target_tenant)

    reply = await _setup_reply(message, target_tenant, is_vip_setup, is_private, owner_assigned)
    await message.reply(reply, parse_mode="Markdown")


async def _ensure_owner(message: Message, db, tenant: Tenant, is_private: bool) -> bool | None:
    if tenant.owner_user_id:
        return False

    if message.sender_chat and not is_private:
        await message.reply(
            "⚠️ **Ошибка:** Вы пишете от имени группы. \n\n"
            "Чтобы я мог назначить вас владельцем школы, пожалуйста: \n"
            "1. Отключите 'Анонимное администрирование' в настройках группы.\n"
            "2. Или отправьте мне команду `/setup <ваш_код>` в **личные сообщения**.\n\n"
            "После этого я узнаю ваш личный ID и смогу открыть доступ к админке."
        )
        return None

    stmt_u = select(User).where(User.telegram_id == message.from_user.id)
    res_u = await db.execute(stmt_u)
    user = res_u.scalars().first()
    if not user:
        user = User(telegram_id=message.from_user.id, username=message.from_user.username, avatar_url=None)
        db.add(user)
        await db.commit()
        await db.refresh(user)

    from app.models import UserAdminStatus
    if user.admin_status != UserAdminStatus.approved:
        user.admin_status = UserAdminStatus.approved
        db.add(user)

    tenant.owner_user_id = user.id
    logging.info("OWNER: User %s assigned as owner of tenant %s", user.id, tenant.id)
    return True


async def _setup_reply(message: Message, tenant: Tenant, is_vip_setup: bool, is_private: bool, owner_assigned: bool) -> str:
    group_type = "VIP" if is_vip_setup else "Free"
    if is_private:
        return (
            f"✅ **Владелец подтвержден!** Теперь вы — хозяин школы **{tenant.name}**.\n\n"
            f"Теперь добавьте меня в вашу **{group_type}** группу Telegram и отправьте там ту же команду "
            f"`/setup <code> {'vip' if is_vip_setup else ''}`, чтобы я связал курсы с группой."
        )

    reply = f"✅ **СВЯЗАНО!** Эта группа теперь является **{group_type}** классом для: **{tenant.name}**"
    topic_id = message.message_thread_id if message.is_topic_message else None
    if topic_id:
        reply += f"\n📌 **Тема привязана:** ID {topic_id}"
    if owner_assigned:
        bot_username = (await message.bot.get_me()).username
        reply += f"\n\n👤 **Администратор назначен:** {message.from_user.full_name}. Теперь вы можете управлять школой в [Админ-панели](https://t.me/{bot_username}/admin)."
    return reply


@router.message(Command("debug_tenant"))
async def cmd_debug_tenant(message: Message, db):
    chat_id = message.chat.id
    logging.info("DEBUG: Checking tenant for chat %s", chat_id)

    res_free = await db.execute(select(Tenant).where(Tenant.telegram_group_id == chat_id))
    tenant_free = res_free.scalars().first()
    res_vip = await db.execute(select(Tenant).where(Tenant.telegram_group_id_vip == chat_id))
    tenant_vip = res_vip.scalars().first()

    reply = f"🔍 **Debug Info for Chat ID:** `{chat_id}`\n\n"
    if tenant_free:
        reply += f"✅ **Connected as Free Group**\nTenant: {tenant_free.name}\nID: `{tenant_free.id}`\nOwner ID: `{tenant_free.owner_user_id}`\n"
    else:
        reply += "❌ Not connected as Free Group\n"
    reply += "\n"
    if tenant_vip:
        reply += f"✅ **Connected as VIP Group**\nTenant: {tenant_vip.name}\nID: `{tenant_vip.id}`\nOwner ID: `{tenant_vip.owner_user_id}`\n"
    else:
        reply += "❌ Not connected as VIP Group\n"
    await message.reply(reply, parse_mode="Markdown")


@router.message(Command("sync"))
async def cmd_sync(message: Message, db, tenant: Tenant | None = None):
    if not tenant:
        await message.reply("⚠️ Эта группа не подключена к школе.")
        return

    user_status = await message.bot.get_chat_member(message.chat.id, message.from_user.id)
    if user_status.status not in ["creator", "administrator"]:
        await message.reply("❌ Только администраторы группы могут запускать эту команду.")
        return

    msg = await message.reply("🔄 Синхронизация админов...")
    promoted, total = await sync_group_admins(message.chat.id, tenant, db, bot=message.bot)
    await msg.edit_text(
        f"✅ **Синхронизация завершена!**\n\n"
        f"Найдено **{total}** администраторов.\n"
        f"Повышено **{promoted}** новых админов в приложении."
    )
