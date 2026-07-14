import os
import uuid
from datetime import datetime

from aiogram import F, Router
from aiogram.filters import Command
from aiogram.types import CallbackQuery, InlineKeyboardButton, InlineKeyboardMarkup, Message, WebAppInfo
from sqlalchemy.future import select

from app.models import MemberRole, MemberStatus, Tenant, TenantMember, User
from app.services.bot_entitlements import can_activate_student
from bot.course_funnel import (
    COURSE_CHECK_CALLBACK_PREFIX,
    handle_course_check_callback,
    handle_course_start,
    is_course_start_param,
)
from bot.lesson_funnel import (
    LESSON_CHECK_CALLBACK_PREFIX,
    handle_lesson_check_callback,
    handle_lesson_start,
    is_lesson_start_param,
)
from bot.learning_messages import LEARNING_REPLY_PARSE_MODE, start_reply

router = Router()

ACTIVE_TELEGRAM_MEMBER_STATUSES = {"member", "administrator", "creator"}
INACTIVE_TELEGRAM_MEMBER_STATUSES = {"left", "kicked"}
UNKNOWN_ACCESS_MESSAGE = (
    "Не удалось проверить доступ к Telegram-группе школы. "
    "Попробуйте открыть Mini App позже или обратитесь к администратору."
)
NO_MEMBERSHIP_MESSAGE = (
    "Доступ к школе пока не открыт. "
    "Вступите в группу школы или обратитесь к администратору."
)
SCHOOL_UNAVAILABLE_MESSAGE = (
    "Школа временно не принимает новых учеников. "
    "Обратитесь к администратору школы."
)


@router.message(Command("start"))
async def cmd_start(message: Message, db):
    user_tg_id = message.from_user.id

    args = message.text.split()
    start_param = args[1] if len(args) > 1 else None

    user = await _get_or_create_private_user(message.from_user, db)

    if is_lesson_start_param(start_param):
        handled = await handle_lesson_start(message, db, user, start_param)
        if handled:
            return
    if is_course_start_param(start_param):
        handled = await handle_course_start(message, db, user, start_param)
        if handled:
            return

    target_tenant = None
    if start_param:
        try:
            target_tenant = await db.get(Tenant, uuid.UUID(start_param))
            if target_tenant and target_tenant.deleted_at:
                target_tenant = None
        except ValueError:
            target_tenant = None

    if not target_tenant:
        stmt_membership_tenant = (
            select(Tenant)
            .join(TenantMember)
            .where(
                TenantMember.user_id == user.id,
                TenantMember.status == MemberStatus.active,
                TenantMember.deleted_at == None,
                Tenant.deleted_at == None,
            )
            .order_by(TenantMember.joined_at.asc())
            .limit(2)
        )
        res_membership_tenant = await db.execute(stmt_membership_tenant)
        membership_tenants = list(res_membership_tenant.scalars().all())
        if len(membership_tenants) > 1:
            await message.reply("Выберите школу по её ссылке, чтобы открыть обучение.")
            return
        target_tenant = membership_tenants[0] if membership_tenants else None

    has_group_access = False
    denial_message = NO_MEMBERSHIP_MESSAGE
    if target_tenant:
        stmt_m = select(TenantMember).where(
            TenantMember.user_id == user.id,
            TenantMember.tenant_id == target_tenant.id,
        )
        res_m = await db.execute(stmt_m)
        existing_membership = res_m.scalars().first()
        if existing_membership and _is_manager(existing_membership):
            has_group_access = True
        elif not _tenant_has_learning_group(target_tenant):
            has_group_access = bool(existing_membership and existing_membership.status == MemberStatus.active)
        else:
            group_access = await _linked_group_access_status(message, target_tenant, user_tg_id)
            if group_access == "verified":
                needs_activation = not existing_membership or existing_membership.status == MemberStatus.paused
                activation_allowed = (
                    not needs_activation
                    or await can_activate_student(db, target_tenant)
                )
                has_group_access = activation_allowed
                if not activation_allowed:
                    denial_message = SCHOOL_UNAVAILABLE_MESSAGE
                elif existing_membership and existing_membership.status == MemberStatus.paused:
                    existing_membership.status = MemberStatus.active
                    existing_membership.paused_at = None
                    db.add(existing_membership)
                    await db.commit()
                elif not existing_membership:
                    member = TenantMember(user_id=user.id, tenant_id=target_tenant.id)
                    db.add(member)
                    await db.commit()
            elif group_access == "denied":
                if existing_membership and existing_membership.status == MemberStatus.active:
                    existing_membership.status = MemberStatus.paused
                    existing_membership.paused_at = datetime.utcnow()
                    db.add(existing_membership)
                    await db.commit()
                denial_message = NO_MEMBERSHIP_MESSAGE
            else:
                has_group_access = bool(existing_membership and existing_membership.status == MemberStatus.active)
                denial_message = UNKNOWN_ACCESS_MESSAGE

    if target_tenant and not has_group_access:
        await message.reply(denial_message)
        return

    webapp_url = os.getenv("WEBAPP_URL", "https://karpix-skool.vercel.app")
    app_url = f"{webapp_url}?startapp={target_tenant.id}" if target_tenant else webapp_url

    keyboard = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="🚀 Открыть обучение", web_app=WebAppInfo(url=app_url))]
    ])

    await message.reply(
        start_reply(target_tenant.name if target_tenant else None),
        parse_mode=LEARNING_REPLY_PARSE_MODE,
        reply_markup=keyboard,
    )


@router.callback_query(F.data.startswith(LESSON_CHECK_CALLBACK_PREFIX))
async def on_lesson_check(callback: CallbackQuery, db):
    user = await _get_or_create_private_user(callback.from_user, db)
    await handle_lesson_check_callback(callback, db, user)


@router.callback_query(F.data.startswith(COURSE_CHECK_CALLBACK_PREFIX))
async def on_course_check(callback: CallbackQuery, db):
    user = await _get_or_create_private_user(callback.from_user, db)
    await handle_course_check_callback(callback, db, user)


async def _linked_group_access_status(message: Message, tenant: Tenant, telegram_id: int) -> str:
    chat_ids = [chat_id for chat_id in (tenant.telegram_group_id, tenant.telegram_group_id_vip) if chat_id]
    if not chat_ids:
        return "unknown"

    saw_denied = False
    saw_unknown = False
    for chat_id in chat_ids:
        try:
            member = await message.bot.get_chat_member(chat_id, telegram_id)
        except Exception:
            saw_unknown = True
            continue
        status = getattr(member.status, "value", member.status)
        if status in ACTIVE_TELEGRAM_MEMBER_STATUSES:
            return "verified"
        if status == "restricted":
            if getattr(member, "is_member", False):
                return "verified"
            saw_denied = True
        elif status in INACTIVE_TELEGRAM_MEMBER_STATUSES:
            saw_denied = True
        else:
            saw_unknown = True
    if saw_unknown:
        return "unknown"
    if saw_denied:
        return "denied"
    return "unknown"


def _tenant_has_learning_group(tenant: Tenant) -> bool:
    return bool(tenant.telegram_group_id or tenant.telegram_group_id_vip)


def _is_manager(membership: TenantMember) -> bool:
    return membership.role in {MemberRole.owner, MemberRole.admin, MemberRole.moderator}


async def _get_or_create_private_user(from_user, db) -> User:
    stmt = select(User).where(User.telegram_id == from_user.id)
    result = await db.execute(stmt)
    user = result.scalars().first()
    if user:
        return user

    user = User(
        telegram_id=from_user.id,
        username=from_user.username,
        avatar_url=None,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user
