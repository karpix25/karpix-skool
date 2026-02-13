import logging
from aiogram import Bot
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
