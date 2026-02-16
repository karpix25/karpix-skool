import uuid
import logging
from datetime import datetime, timedelta
from typing import Optional, Dict

from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession
from aiogram import Bot

from ..models import TenantMember, User, MessageStore
from ..config import settings

logger = logging.getLogger(__name__)

# Level thresholds inspired by Skool (exponential)
LEVEL_THRESHOLDS = {
    1: 0,           # Новичок
    2: 20,          # Ученик
    3: 100,         # Исследователь
    4: 400,         # Активист
    5: 1200,        # Знаток
    6: 4000,        # Эксперт
    7: 10000,       # Мастер
    8: 25000,       # Гуру
    9: 60000        # Легенда
}

class GamificationService:
    @staticmethod
    async def add_xp(
        session: AsyncSession,
        member: TenantMember,
        amount: int,
        source: str = "message" # "message", "reaction", "lesson"
    ) -> bool:
        """
        Awards XP to a tenant member with rate limiting for messages.
        Returns True if XP was granted, False otherwise.
        """
        # Rate limit for messages: max 20 XP per hour
        if source == "message":
            now = datetime.utcnow()
            
            # Reset counter if hour has passed
            if not member.last_xp_at or (now - member.last_xp_at) > timedelta(hours=1):
                member.hourly_xp_count = 0
                
            if member.hourly_xp_count >= 20:
                logger.debug(f"XP_LIMIT: User {member.user_id} reached message XP limit in tenant {member.tenant_id}")
                return False
                
            member.hourly_xp_count += amount
            member.last_xp_at = now

        # Add XP
        old_level = member.level
        member.xp += amount
        
        # Check Level Up
        new_level = old_level
        for level, threshold in sorted(LEVEL_THRESHOLDS.items(), key=lambda x: x[0], reverse=True):
            if member.xp >= threshold:
                new_level = level
                break
        
        if new_level > old_level:
            member.level = new_level
            logger.info(f"LEVEL_UP: User {member.user_id} reached level {new_level} in tenant {member.tenant_id}")
            return True # Level up occurred
            
        return False # XP added, but no level up

    @staticmethod
    async def track_message(
        session: AsyncSession,
        tenant_id: uuid.UUID,
        user_id: uuid.UUID,
        chat_id: int,
        message_id: int
    ):
        """Saves message authorship for reaction points."""
        stmt = select(MessageStore).where(
            MessageStore.chat_id == chat_id,
            MessageStore.message_id == message_id
        )
        res = await session.execute(stmt)
        if res.scalars().first():
            return

        msg = MessageStore(
            tenant_id=tenant_id,
            user_id=user_id,
            chat_id=chat_id,
            message_id=message_id
        )
        session.add(msg)
        await session.flush()

    @staticmethod
    async def handle_reaction(
        session: AsyncSession,
        chat_id: int,
        message_id: int,
        bot: Bot
    ):
        """Awards XP to the author of a message when someone reacts."""
        # Find author
        stmt = select(MessageStore).where(
            MessageStore.chat_id == chat_id,
            MessageStore.message_id == message_id
        )
        res = await session.execute(stmt)
        msg_record = res.scalars().first()
        
        if not msg_record:
            return

        # Find membership
        stmt_m = select(TenantMember).where(
            TenantMember.tenant_id == msg_record.tenant_id,
            TenantMember.user_id == msg_record.user_id
        )
        res_m = await session.execute(stmt_m)
        member = res_m.scalars().first()
        
        if not member:
            return

        # Award XP for reaction (+2 points for quality)
        leveled_up = await GamificationService.add_xp(session, member, 2, source="reaction")
        session.add(member)
        await session.commit()

        if leveled_up:
            await GamificationService.notify_level_up(bot, member, session)

    @staticmethod
    async def notify_level_up(bot: Bot, member: TenantMember, session: AsyncSession):
        """Sends a notification to the user about their level up."""
        try:
            # Need telegram_id from User
            from ..models import User
            user = await session.get(User, member.user_id)
            if user and user.telegram_id:
                await GamificationService.notify_level_up_direct(bot, user.telegram_id, member.level)
        except Exception as e:
            logger.error(f"Notification error: {e}")

    @staticmethod
    async def notify_level_up_direct(bot_or_token: str | Bot, telegram_id: int, level: int):
        """Helper to send TG message."""
        bot = None
        should_close = False
        try:
            if isinstance(bot_or_token, str):
                bot = Bot(token=bot_or_token)
                should_close = True
            else:
                bot = bot_or_token

            await bot.send_message(
                chat_id=telegram_id,
                text=f"🎉 **УРОВЕНЬ ВВЕРХ!**\n\nПоздравляем! Ты достиг **Уровня {level}**! Продолжай в том же духе! 🚀",
                parse_mode="Markdown"
            )
        except Exception as e:
            logger.error(f"TG Notification error: {e}")
        finally:
            if should_close and bot:
                await bot.session.close()
