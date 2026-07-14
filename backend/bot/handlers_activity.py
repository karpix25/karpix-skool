import logging
from datetime import datetime

from aiogram import Router
from aiogram.types import ChatMemberUpdated, Message, MessageReactionUpdated
from sqlalchemy.future import select

from app.models import MemberRole, MemberRoleSource, MemberStatus, Tenant, TenantMember, User
from app.services.bot_entitlements import can_activate_student
from app.services.gamification import GamificationService
from app.services.user import sync_user_avatar

router = Router()


@router.message()
async def track_activity(message: Message, db, tenant: Tenant | None = None):
    logging.info("TRACK: Message from %s in chat %s (tenant: %s)", message.from_user.id, message.chat.id, tenant.name if tenant else "None")
    if not tenant or message.from_user.is_bot:
        return

    user = await _get_or_create_user(message, db)
    if await sync_user_avatar(user, message.bot):
        db.add(user)
        await db.commit()

    member = await _get_or_create_member(db, tenant, user)
    if not member:
        return
    message_source_id = f"{message.chat.id}:{message.message_id}"
    leveled_up = await GamificationService.add_xp(
        db,
        member,
        amount=1,
        source="message",
        source_id=message_source_id,
    )
    await GamificationService.track_message(
        db,
        tenant_id=tenant.id,
        user_id=user.id,
        chat_id=message.chat.id,
        message_id=message.message_id,
    )

    if leveled_up:
        await GamificationService.notify_level_up_direct(message.bot, user.telegram_id, member.level)

    db.add(member)
    await db.commit()


async def _get_or_create_user(message: Message, db) -> User:
    result = await db.execute(select(User).where(User.telegram_id == message.from_user.id))
    user = result.scalars().first()
    if user:
        return user

    user = User(telegram_id=message.from_user.id, username=message.from_user.username, avatar_url=None)
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


async def _get_or_create_member(db, tenant: Tenant, user: User) -> TenantMember | None:
    result = await db.execute(
        select(TenantMember).where(
            TenantMember.tenant_id == tenant.id,
            TenantMember.user_id == user.id,
        )
    )
    member = result.scalars().first()
    if not member:
        if not await can_activate_student(db, tenant):
            logging.warning("LIMIT: Student membership rejected for tenant %s", tenant.id)
            return None
        member = TenantMember(
            tenant_id=tenant.id,
            user_id=user.id,
            role=MemberRole.student,
            cohort_start_date=datetime.utcnow(),
            status=MemberStatus.active,
        )
        db.add(member)
        logging.info("SYNC: Discovered existing TG member %s via message activity.", user.username)
    elif member.status == MemberStatus.paused:
        if not await can_activate_student(db, tenant, role=member.role):
            logging.warning("LIMIT: Student reactivation rejected for tenant %s", tenant.id)
            return None
        member.status = MemberStatus.active
        member.paused_at = None
        db.add(member)
        logging.info("SYNC: Reactivated paused member %s via message activity.", user.username)
    return member


@router.message_reaction()
async def on_message_reaction(update: MessageReactionUpdated, db):
    await GamificationService.handle_reaction(
        db,
        chat_id=update.chat.id,
        message_id=update.message_id,
        bot=update.bot,
    )


@router.chat_member()
async def on_chat_member_update(update: ChatMemberUpdated, db):
    tenant = await _find_tenant_by_chat(update, db)
    if not tenant:
        return

    user = await _find_user_by_telegram_id(update.from_user.id, db)
    if not user:
        return

    member = await _find_member(db, tenant, user)
    if not member:
        await _create_member_on_join(update, db, tenant, user)
        return

    target_role = (
        MemberRole.admin
        if update.new_chat_member.status in ["administrator", "creator"]
        else member.role
    )
    if (
        member.status == MemberStatus.paused
        and update.new_chat_member.status not in ["left", "kicked"]
        and not await can_activate_student(db, tenant, role=target_role)
    ):
        logging.warning("LIMIT: Membership reactivation rejected for tenant %s", tenant.id)
        return

    _sync_member_status(update, member)
    _sync_member_role(update, tenant, user, member)
    db.add(member)
    await db.commit()


async def _find_tenant_by_chat(update: ChatMemberUpdated, db) -> Tenant | None:
    result = await db.execute(
        select(Tenant).where(
            (Tenant.telegram_group_id == update.chat.id) |
            (Tenant.telegram_group_id_vip == update.chat.id)
        )
    )
    return result.scalars().first()


async def _find_user_by_telegram_id(telegram_id: int, db) -> User | None:
    result = await db.execute(select(User).where(User.telegram_id == telegram_id))
    return result.scalars().first()


async def _find_member(db, tenant: Tenant, user: User) -> TenantMember | None:
    result = await db.execute(
        select(TenantMember).where(
            TenantMember.user_id == user.id,
            TenantMember.tenant_id == tenant.id,
        )
    )
    return result.scalars().first()


async def _create_member_on_join(update: ChatMemberUpdated, db, tenant: Tenant, user: User) -> None:
    if update.new_chat_member.status in ["member", "administrator", "creator"]:
        role = MemberRole.admin if update.new_chat_member.status in ["administrator", "creator"] else MemberRole.student
        if not await can_activate_student(db, tenant, role=role):
            logging.warning("LIMIT: New membership rejected for tenant %s", tenant.id)
            return
        member = TenantMember(
            user_id=user.id,
            tenant_id=tenant.id,
            status=MemberStatus.active,
            role=role,
            role_source=MemberRoleSource.telegram.value,
        )
        db.add(member)
        await db.commit()

    if await sync_user_avatar(user, update.bot):
        db.add(user)
        await db.commit()


def _sync_member_status(update: ChatMemberUpdated, member: TenantMember) -> None:
    is_leaving = update.new_chat_member.status in ["left", "kicked"]
    was_paused = member.status == MemberStatus.paused
    if is_leaving and member.status == MemberStatus.active:
        member.status = MemberStatus.paused
        member.paused_at = datetime.utcnow()
        logging.info("STATUS PAUSE: User %s left chat %s. Access paused.", update.from_user.id, update.chat.id)
    elif not is_leaving and was_paused:
        member.status = MemberStatus.active
        member.paused_at = None
        logging.info("STATUS RESUME: User %s rejoined chat %s. Access restored.", update.from_user.id, update.chat.id)


def _sync_member_role(update: ChatMemberUpdated, tenant: Tenant, user: User, member: TenantMember) -> None:
    if user.id == tenant.owner_user_id:
        return

    new_status = update.new_chat_member.status
    if new_status in ["administrator", "creator"] and member.role != MemberRole.admin:
        member.role = MemberRole.admin
        member.role_source = MemberRoleSource.telegram.value
        logging.info("ROLE: Promoted %s to ADMIN in tenant %s", user.username, tenant.id)
    elif (
        new_status == "member"
        and member.role == MemberRole.admin
        and member.role_source == MemberRoleSource.telegram.value
    ):
        member.role = MemberRole.student
        member.role_source = MemberRoleSource.telegram.value
        logging.info("ROLE: Demoted %s to STUDENT in tenant %s", user.username, tenant.id)
