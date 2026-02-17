import logging
import os
from typing import Optional
from aiogram import Bot
from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton, WebAppInfo, URLInputFile
from sqlalchemy.future import select
from app.models import Tenant, TenantMember, User, MemberRole, MemberStatus
from app.config import settings

async def get_bot():
    return Bot(token=settings.BOT_TOKEN)

async def sync_group_admins(chat_id: int, tenant: Tenant, db, bot: Bot = None) -> tuple[int, int]:
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
        try:
            admins = await bot.get_chat_administrators(chat_id)
        except Exception as e:
            logging.error(f"Failed to get admins for chat {chat_id}: {e}")
            return 0, 0

        promoted = 0
        total = 0

        for admin in admins:
            if admin.user.is_bot:
                continue
                
            total += 1
            user_tg_id = admin.user.id
            
            # 1. Find or Create User
            stmt = select(User).where(User.telegram_id == user_tg_id)
            res = await db.execute(stmt)
            user = res.scalars().first()
            
            if not user:
                user = User(
                    telegram_id=user_tg_id,
                    username=admin.user.username,
                    avatar_url=None
                )
                db.add(user)
                await db.commit()
                await db.refresh(user)

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
            if member.role != MemberRole.admin:
                member.role = MemberRole.admin
                db.add(member)
                promoted += 1
                logging.info(f"SYNC: Promoted {user.username} (ID: {user.id}) to ADMIN in tenant {tenant.id}")

        await db.commit()
        return promoted, total
        
    finally:
        if should_close:
            await bot.session.close()

async def send_telegram_notification(telegram_id: int, message: str):
    """
    Sends a message to a specific Telegram user.
    """
    bot = await get_bot()
    try:
        await bot.send_message(telegram_id, message, parse_mode="Markdown")
        logging.info(f"NOTIFY: Message sent to user {telegram_id}")
    except Exception as e:
        logging.error(f"Failed to send telegram notification to {telegram_id}: {e}")
    finally:
        await bot.session.close()

async def check_user_membership(telegram_id: int, tenant: Tenant, bot: Bot = None) -> tuple[bool, Optional[MemberRole]]:
    """
    Checks if the user is a member of the tenant's Telegram group(s).
    Returns (is_member, suggested_role).
    """
    should_close = False
    if not bot:
        bot = await get_bot()
        should_close = True
        
    try:
        # Check standard group
        chat_ids = []
        if tenant.telegram_group_id:
            chat_ids.append(tenant.telegram_group_id)
        if tenant.telegram_group_id_vip:
            chat_ids.append(tenant.telegram_group_id_vip)
            
        for chat_id in chat_ids:
            try:
                member = await bot.get_chat_member(chat_id, telegram_id)
                if member.status in ["member", "administrator", "creator"]:
                    role = MemberRole.admin if member.status in ["administrator", "creator"] else MemberRole.student
                    return True, role
            except Exception:
                continue
                
        return False, None
    finally:
        if should_close:
            await bot.session.close()

async def broadcast_course_announcement(chat_id: int, course_title: str, course_description: str, cover_url: Optional[str], custom_text: str, setup_code: str, message_thread_id: Optional[int] = None):
    """
    Sends a rich announcement to a group chat.
    """
    bot = await get_bot()
    try:
        # 1. Prepare message
        caption = f"🚀 **НОВЫЙ КУРС: {course_title}**\n\n"
        if custom_text:
            caption += f"{custom_text}\n\n"
        else:
            caption += f"{course_description}\n\n"
        
        caption += "👇 Присоединяйся к обучению прямо сейчас!"
        
        # 2. Prepare Keyboard
        # Use a deep link to the Mini App: https://t.me/botusername/appname?startapp=...
        # This avoids BUTTON_TYPE_INVALID errors in some group contexts and is more reliable.
        
        button_text = "📖 Начать обучение"
        
        bot_info = await bot.get_me()
        bot_username = bot_info.username
        app_name = settings.APP_SHORT_NAME # Defaults to "app" in config
        
        deep_link = f"https://t.me/{bot_username}/{app_name}?startapp={setup_code}"
        
        keyboard = InlineKeyboardMarkup(inline_keyboard=[
            [InlineKeyboardButton(text=button_text, url=deep_link)]
        ])
        
        # 3. Send Message (Photo if cover exists, else Text)
        if cover_url:
            await bot.send_photo(
                chat_id=chat_id,
                photo=cover_url,
                caption=caption,
                parse_mode="Markdown",
                reply_markup=keyboard,
                message_thread_id=message_thread_id
            )
        else:
            await bot.send_message(
                chat_id=chat_id,
                text=caption,
                parse_mode="Markdown",
                reply_markup=keyboard,
                message_thread_id=message_thread_id
            )
            
        logging.info(f"BROADCAST: Announcement sent to chat {chat_id}, topic {message_thread_id}")
    except Exception as e:
        logging.error(f"Failed to broadcast course announcement to {chat_id}: {e}")
    finally:
        await bot.session.close()
