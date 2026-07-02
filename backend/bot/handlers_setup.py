import logging

from aiogram import Router
from aiogram.filters import Command
from aiogram.types import Message
from sqlalchemy.future import select

from app.models import MemberRole, MemberStatus, Tenant, TenantMember, TenantSetupScope, User
from app.services.telegram import sync_group_admins
from app.services.telegram_setup_auth import (
    authorize_group_setup,
    authorize_tenant_setup_user,
)
from app.services.tenant_setup_tokens import (
    SetupTokenFailure,
    mark_setup_token_used,
    resolve_tenant_setup_token,
    validate_setup_token_record,
)
from bot.setup_messages import (
    SETUP_REPLY_PARSE_MODE,
    group_auth_failure_reply,
    group_setup_reply,
    private_setup_reply,
    sender_required_reply,
    tenant_auth_required_reply,
)

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
    explicit_vip_setup = len(args) >= 3 and args[2].lower() == "vip"
    stmt = select(Tenant).where(Tenant.setup_code == connect_code)
    result = await db.execute(stmt)
    target_tenant = result.scalars().first()
    setup_token_record = None

    if not target_tenant:
        token_resolution = await resolve_tenant_setup_token(db, connect_code)
        if not token_resolution.found:
            await message.reply(_setup_token_failure_reply(token_resolution.failure))
            return
        target_tenant = token_resolution.tenant
        setup_token_record = token_resolution.record

    is_private = message.chat.type == "private"
    is_vip_setup = explicit_vip_setup
    if setup_token_record:
        expected_scope = _expected_setup_scope(is_private, explicit_vip_setup, setup_token_record.scope)
        validation = validate_setup_token_record(setup_token_record, expected_scope=expected_scope)
        if not validation.allowed:
            await message.reply(_setup_token_failure_reply(validation.failure))
            return
        is_vip_setup = setup_token_record.scope == TenantSetupScope.vip_group_link

    sender_id = _message_sender_id(message)
    if sender_id is None:
        await message.reply(sender_required_reply(), parse_mode=SETUP_REPLY_PARSE_MODE)
        return

    if is_private:
        owner_assigned = await _handle_private_setup(message, db, target_tenant, sender_id)
        if owner_assigned is None:
            return
    else:
        authorization = await authorize_group_setup(
            db,
            target_tenant,
            bot=message.bot,
            chat_id=message.chat.id,
            sender_telegram_id=sender_id,
        )
        if not authorization.allowed:
            await message.reply(group_auth_failure_reply(authorization.failure), parse_mode=SETUP_REPLY_PARSE_MODE)
            return

        if is_vip_setup and target_tenant.telegram_group_id_vip:
            await message.reply(f"⚠️ Эта школа уже подключена к VIP-группе (ID: {target_tenant.telegram_group_id_vip}).")
            return
        if not is_vip_setup and target_tenant.telegram_group_id:
            await message.reply(f"⚠️ Эта школа уже подключена к обычной группе (ID: {target_tenant.telegram_group_id}).")
            return

        topic_id = message.message_thread_id if message.is_topic_message else None
        logging.info("SETUP: Captured Chat ID %s, Topic ID %s (VIP=%s)", message.chat.id, topic_id, is_vip_setup)
        if is_vip_setup:
            target_tenant.telegram_group_id_vip = message.chat.id
            target_tenant.telegram_topic_id_vip = topic_id
        else:
            target_tenant.telegram_group_id = message.chat.id
            target_tenant.telegram_topic_id = topic_id
        owner_assigned = False

    if setup_token_record:
        mark_setup_token_used(setup_token_record)
        db.add(setup_token_record)

    db.add(target_tenant)
    await db.commit()
    await db.refresh(target_tenant)

    reply = await _setup_reply(message, target_tenant, is_vip_setup, is_private, owner_assigned)
    await message.reply(reply, parse_mode=SETUP_REPLY_PARSE_MODE)


async def _handle_private_setup(message: Message, db, tenant: Tenant, sender_id: int) -> bool | None:
    if not tenant.owner_user_id:
        return await _ensure_owner(message, db, tenant, is_private=True)

    authorization = await authorize_tenant_setup_user(db, tenant, sender_id)
    if not authorization.allowed:
        await message.reply(tenant_auth_required_reply(), parse_mode=SETUP_REPLY_PARSE_MODE)
        return None

    return False


def _message_sender_id(message: Message) -> int | None:
    is_private = message.chat.type == "private"
    if message.sender_chat and not is_private:
        return None
    if not message.from_user:
        return None
    return message.from_user.id


def _expected_setup_scope(
    is_private: bool,
    explicit_vip_setup: bool,
    token_scope: TenantSetupScope,
) -> TenantSetupScope:
    if is_private:
        return TenantSetupScope.owner_invite
    if explicit_vip_setup:
        return TenantSetupScope.vip_group_link
    if token_scope in (TenantSetupScope.free_group_link, TenantSetupScope.vip_group_link):
        return token_scope
    return TenantSetupScope.free_group_link


def _setup_token_failure_reply(failure: SetupTokenFailure | None) -> str:
    if failure == SetupTokenFailure.expired:
        return "❌ Код истёк. Создайте новый код в админ-панели."
    if failure == SetupTokenFailure.used:
        return "❌ Этот код уже был использован. Создайте новый код в админ-панели."
    if failure == SetupTokenFailure.wrong_scope:
        return "❌ Этот код не подходит для этого действия. Создайте код нужного типа в админ-панели."
    return "❌ Неверный код. Проверьте его в админ-панели."


async def _ensure_owner(message: Message, db, tenant: Tenant, is_private: bool) -> bool | None:
    if tenant.owner_user_id:
        return False

    if not is_private:
        await message.reply(
            "⚠️ **Сначала подтвердите владельца в личных сообщениях.**\n\n"
            "Отправьте мне `/setup <ваш_код>` в личку, а затем повторите команду в группе."
        )
        return None

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

    tenant.owner_user_id = user.id
    await _ensure_owner_membership(db, tenant, user)
    logging.info("OWNER: User %s assigned as owner of tenant %s", user.id, tenant.id)
    return True


async def _ensure_owner_membership(db, tenant: Tenant, user: User) -> TenantMember:
    result = await db.execute(
        select(TenantMember).where(
            TenantMember.tenant_id == tenant.id,
            TenantMember.user_id == user.id,
        )
    )
    membership = result.scalars().first()
    if not membership:
        membership = TenantMember(
            tenant_id=tenant.id,
            user_id=user.id,
        )

    membership.role = MemberRole.owner
    membership.status = MemberStatus.active
    membership.is_onboarded = True
    membership.paused_at = None
    membership.deleted_at = None
    db.add(membership)
    return membership


async def _setup_reply(message: Message, tenant: Tenant, is_vip_setup: bool, is_private: bool, owner_assigned: bool) -> str:
    group_type = "VIP" if is_vip_setup else "Free"
    if is_private:
        return private_setup_reply(tenant.name, group_type, is_vip_setup, owner_assigned)

    topic_id = message.message_thread_id if message.is_topic_message else None
    bot_username = None
    if owner_assigned:
        bot_username = (await message.bot.get_me()).username
    return group_setup_reply(
        tenant.name,
        group_type,
        topic_id,
        owner_assigned,
        message.from_user.full_name if message.from_user else None,
        bot_username,
    )


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
    await message.reply(reply)


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
