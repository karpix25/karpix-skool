import logging
import os
import uuid
from dataclasses import dataclass
from enum import Enum
from typing import Optional
from aiogram import Bot
from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton, WebAppInfo, URLInputFile
from sqlalchemy.future import select
from app.models import MemberRoleSource, Tenant, TenantMember, User, MemberRole, MemberStatus
from app.config import settings
from app.services.telegram_messages import build_course_announcement_caption, TELEGRAM_MARKDOWN_V2

async def get_bot():
    return Bot(token=settings.BOT_TOKEN)

def _tenant_admin_chat_ids(chat_id: Optional[int], tenant: Tenant) -> list[int]:
    return list(
        dict.fromkeys(
            group_id
            for group_id in (
                chat_id,
                tenant.telegram_group_id,
                tenant.telegram_group_id_vip,
            )
            if group_id is not None
        )
    )


async def _load_all_group_admins(bot: Bot, chat_ids: list[int]):
    admins_by_telegram_id = {}
    for group_id in chat_ids:
        admins = await bot.get_chat_administrators(group_id)
        for admin in admins:
            if not admin.user.is_bot:
                admins_by_telegram_id[admin.user.id] = admin
    return admins_by_telegram_id


async def sync_group_admins(chat_id: int, tenant: Tenant, db, bot: Bot = None) -> tuple[list[str], int]:
    """
    Fetches admins from Telegram and promotes them in the DB.
    Returns (promoted_count, total_admins_found).
    
    If bot is not provided, a new instance is created and closed after use.
    """
    should_close = False
    if not bot:
        bot = await get_bot()
        should_close = True
        
    try:
        chat_ids = _tenant_admin_chat_ids(chat_id, tenant)
        if not chat_ids:
            return [], 0

        try:
            admins_by_telegram_id = await _load_all_group_admins(bot, chat_ids)
        except Exception as e:
            logging.error(
                "Failed to get complete admin list for tenant %s; role revocation skipped: %s",
                tenant.id,
                e,
            )
            return [], 0

        promoted_names = []
        telegram_admin_ids = set(admins_by_telegram_id)

        for admin in admins_by_telegram_id.values():
            user_tg_id = admin.user.id
            
            # 1. Find or Create User
            stmt = select(User).where(User.telegram_id == user_tg_id)
            res = await db.execute(stmt)
            user = res.scalars().first()
            
            if not user:
                user = User(
                    telegram_id=user_tg_id,
                    username=admin.user.username or f"User_{user_tg_id}",
                    avatar_url=None
                )
                db.add(user)

            # 2. Find or Create TenantMember
            stmt_m = select(TenantMember).where(
                TenantMember.user_id == user.id,
                TenantMember.tenant_id == tenant.id
            )
            res_m = await db.execute(stmt_m)
            member = res_m.scalars().first()
            
            if not member:
                member = TenantMember(
                    user_id=user.id,
                    tenant_id=tenant.id,
                    role=MemberRole.student, # Start as student, promote below
                    status=MemberStatus.active
                )
                db.add(member)
            
            # 3. Promote if not already admin
            # If they are in the admins list, they should be admin in DB.
            # We don't care if they are owner or not here, just sync the role.
            if member.role != MemberRole.admin and member.role != MemberRole.owner:
                member.role = MemberRole.admin
                member.role_source = MemberRoleSource.telegram.value
                db.add(member)
                promoted_names.append(user.username or f"ID_{user.telegram_id}")
                logging.info(f"SYNC: Promoted {user.username} (ID: {user.id}) to ADMIN in tenant {tenant.id}")

        existing_admins_result = await db.execute(
            select(TenantMember, User)
            .join(User, TenantMember.user_id == User.id)
            .where(
                TenantMember.tenant_id == tenant.id,
                TenantMember.role == MemberRole.admin,
                TenantMember.role_source == MemberRoleSource.telegram.value,
                TenantMember.deleted_at == None,
            )
        )
        for member, user in existing_admins_result.all():
            if member.user_id == tenant.owner_user_id:
                continue
            if member.role != MemberRole.admin:
                continue
            if member.role_source != MemberRoleSource.telegram.value:
                continue
            if user.telegram_id is None or user.telegram_id in telegram_admin_ids:
                continue
            member.role = MemberRole.student
            member.role_source = MemberRoleSource.telegram.value
            db.add(member)
            logging.info(
                "SYNC: Demoted %s (ID: %s) from ADMIN in tenant %s",
                user.username,
                user.id,
                tenant.id,
            )

        from datetime import datetime
        tenant.last_sync_at = datetime.utcnow()
        db.add(tenant)
        await db.commit()
        
        return promoted_names, len(telegram_admin_ids)
        
    finally:
        if should_close:
            await bot.session.close()

async def send_telegram_notification(telegram_id: int, message: str, parse_mode: Optional[str] = None):
    """
    Sends a message to a specific Telegram user.
    """
    bot = await get_bot()
    try:
        await bot.send_message(telegram_id, message, parse_mode=parse_mode)
        logging.info(f"NOTIFY: Message sent to user {telegram_id}")
    except Exception as e:
        logging.error(f"Failed to send telegram notification to {telegram_id}: {e}")
    finally:
        await bot.session.close()


class TelegramMembershipState(str, Enum):
    verified = "verified"
    denied = "denied"
    unknown = "unknown"


@dataclass(frozen=True)
class TelegramMembershipCheck:
    state: TelegramMembershipState
    role: Optional[MemberRole] = None


ACTIVE_TELEGRAM_MEMBER_STATUSES = {"member", "administrator", "creator"}
INACTIVE_TELEGRAM_MEMBER_STATUSES = {"left", "kicked"}


def _membership_check_from_chat_member(member) -> TelegramMembershipCheck:
    status = getattr(member.status, "value", member.status)
    if status in {"administrator", "creator"}:
        return TelegramMembershipCheck(TelegramMembershipState.verified, MemberRole.admin)
    if status == "member":
        return TelegramMembershipCheck(TelegramMembershipState.verified, MemberRole.student)
    if status == "restricted":
        if getattr(member, "is_member", False):
            return TelegramMembershipCheck(TelegramMembershipState.verified, MemberRole.student)
        return TelegramMembershipCheck(TelegramMembershipState.denied)
    if status in INACTIVE_TELEGRAM_MEMBER_STATUSES:
        return TelegramMembershipCheck(TelegramMembershipState.denied)
    return TelegramMembershipCheck(TelegramMembershipState.unknown)


async def check_user_membership_state(
    telegram_id: int,
    tenant: Tenant,
    bot: Bot = None,
) -> TelegramMembershipCheck:
    """
    Checks linked Telegram groups and distinguishes Telegram/API uncertainty
    from a definitive non-member status.
    """
    should_close = False
    if not bot:
        bot = await get_bot()
        should_close = True

    try:
        chat_ids = [
            chat_id
            for chat_id in (tenant.telegram_group_id, tenant.telegram_group_id_vip)
            if chat_id
        ]
        if not chat_ids:
            return TelegramMembershipCheck(TelegramMembershipState.unknown)

        saw_denied = False
        saw_unknown = False
        for chat_id in chat_ids:
            check = await check_user_chat_membership_state(telegram_id, chat_id, bot)
            if check.state == TelegramMembershipState.verified:
                return check
            if check.state == TelegramMembershipState.denied:
                saw_denied = True
            else:
                saw_unknown = True

        if saw_unknown:
            return TelegramMembershipCheck(TelegramMembershipState.unknown)
        if saw_denied:
            return TelegramMembershipCheck(TelegramMembershipState.denied)
        return TelegramMembershipCheck(TelegramMembershipState.unknown)
    finally:
        if should_close:
            await bot.session.close()


async def check_user_chat_membership_state(
    telegram_id: int,
    chat_id: int,
    bot: Bot = None,
) -> TelegramMembershipCheck:
    should_close = False
    if not bot:
        bot = await get_bot()
        should_close = True

    try:
        try:
            member = await bot.get_chat_member(chat_id, telegram_id)
        except Exception as exc:
            logging.warning(
                "Telegram membership check failed for user %s chat %s: %s",
                telegram_id,
                chat_id,
                exc,
            )
            return TelegramMembershipCheck(TelegramMembershipState.unknown)

        return _membership_check_from_chat_member(member)
    finally:
        if should_close:
            await bot.session.close()


async def check_user_membership(telegram_id: int, tenant: Tenant, bot: Bot = None) -> tuple[bool, Optional[MemberRole]]:
    """
    Checks if the user is a member of the tenant's Telegram group(s).
    Returns (is_member, suggested_role).
    """
    check = await check_user_membership_state(telegram_id, tenant, bot)
    return check.state == TelegramMembershipState.verified, check.role

async def broadcast_course_announcement(
    chat_id: int,
    course_title: str,
    course_description: str,
    cover_url: Optional[str],
    custom_text: str,
    tenant_id: uuid.UUID,
    message_thread_id: Optional[int] = None,
):
    """
    Sends a rich announcement to a group chat.
    """
    bot = await get_bot()
    try:
        # 1. Prepare message
        caption = build_course_announcement_caption(course_title, course_description, custom_text)
        
        # 2. Prepare Keyboard
        # Use a deep link to the Mini App: https://t.me/botusername/appname?startapp=...
        # This avoids BUTTON_TYPE_INVALID errors in some group contexts and is more reliable.
        
        button_text = "📖 Начать обучение"
        
        bot_info = await bot.get_me()
        bot_username = bot_info.username
        app_name = settings.APP_SHORT_NAME # Defaults to "app" in config
        
        deep_link = f"https://t.me/{bot_username}/{app_name}?startapp={tenant_id}"
        
        keyboard = InlineKeyboardMarkup(inline_keyboard=[
            [InlineKeyboardButton(text=button_text, url=deep_link)]
        ])
        
        # 3. Send Message (Photo if cover exists, else Text)
        if cover_url:
            await bot.send_photo(
                chat_id=chat_id,
                photo=cover_url,
                caption=caption,
                parse_mode=TELEGRAM_MARKDOWN_V2,
                reply_markup=keyboard,
                message_thread_id=message_thread_id
            )
        else:
            await bot.send_message(
                chat_id=chat_id,
                text=caption,
                parse_mode=TELEGRAM_MARKDOWN_V2,
                reply_markup=keyboard,
                message_thread_id=message_thread_id
            )
            
        logging.info(f"BROADCAST: Announcement sent to chat {chat_id}, topic {message_thread_id}")
    except Exception as e:
        logging.error(f"Failed to broadcast course announcement to {chat_id}: {e}")
    finally:
        await bot.session.close()
