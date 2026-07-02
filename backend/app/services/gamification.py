import uuid
import logging
from datetime import datetime, timedelta
from typing import Optional

from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession
from aiogram import Bot

from ..models import TenantMember, User, MessageStore
from .telegram_messages import TELEGRAM_MARKDOWN_V2, build_level_up_message
from .xp_ledger import LEVEL_THRESHOLDS as LEDGER_LEVEL_THRESHOLDS, XPAwardResult, XPLedgerService

logger = logging.getLogger(__name__)
LEVEL_THRESHOLDS = LEDGER_LEVEL_THRESHOLDS

class GamificationService:
    @staticmethod
    async def award_xp(
        session: AsyncSession,
        member: TenantMember,
        amount: int,
        source: str = "message",
        source_id: object | None = None,
        idempotency_key: Optional[str] = None,
    ) -> XPAwardResult:
        """
        Awards XP through the ledger. Message XP keeps the existing hourly cap.
        """
        if source_id is None and idempotency_key is None:
            raise ValueError("source_id or idempotency_key is required for XP idempotency")

        resolved_source_id = source_id if source_id is not None else idempotency_key
        key = idempotency_key or XPLedgerService.build_idempotency_key(
            tenant_id=member.tenant_id,
            user_id=member.user_id,
            source_type=source,
            source_id=resolved_source_id,
        )

        existing = await XPLedgerService.get_event_by_key(session, key)
        if existing:
            return XPAwardResult(
                event=existing,
                granted=False,
                leveled_up=False,
                new_xp=member.xp,
                new_level=member.level,
            )

        old_hourly_count = member.hourly_xp_count
        old_last_xp_at = member.last_xp_at
        if source == "message":
            now = datetime.utcnow()

            if not member.last_xp_at or (now - member.last_xp_at) > timedelta(hours=1):
                member.hourly_xp_count = 0

            if member.hourly_xp_count >= 20:
                logger.debug(f"XP_LIMIT: User {member.user_id} reached message XP limit in tenant {member.tenant_id}")
                return XPAwardResult(
                    event=None,
                    granted=False,
                    leveled_up=False,
                    new_xp=member.xp,
                    new_level=member.level,
                )

            member.hourly_xp_count += amount
            member.last_xp_at = now

        result = await XPLedgerService.award_xp(
            session=session,
            member=member,
            points=amount,
            source_type=source,
            source_id=resolved_source_id,
            idempotency_key=key,
        )

        if source == "message" and not result.granted:
            member.hourly_xp_count = old_hourly_count
            member.last_xp_at = old_last_xp_at

        if result.leveled_up:
            logger.info(f"LEVEL_UP: User {member.user_id} reached level {result.new_level} in tenant {member.tenant_id}")

        return result

    @staticmethod
    async def add_xp(
        session: AsyncSession,
        member: TenantMember,
        amount: int,
        source: str = "message",
        source_id: object | None = None,
        idempotency_key: Optional[str] = None,
    ) -> bool:
        """Compatibility wrapper for callers that only need level-up state."""
        result = await GamificationService.award_xp(
            session,
            member,
            amount,
            source=source,
            source_id=source_id,
            idempotency_key=idempotency_key,
        )
        return result.leveled_up

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
        res = await session.exec(stmt)
        if res.first():
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
        res = await session.exec(stmt)
        msg_record = res.first()
        
        if not msg_record:
            return

        # Find membership
        stmt_m = select(TenantMember).where(
            TenantMember.tenant_id == msg_record.tenant_id,
            TenantMember.user_id == msg_record.user_id
        )
        res_m = await session.exec(stmt_m)
        member = res_m.first()
        
        if not member:
            return

        reaction_source_id = f"{chat_id}:{message_id}"
        leveled_up = await GamificationService.add_xp(
            session,
            member,
            2,
            source="reaction",
            source_id=reaction_source_id,
        )
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
                text=build_level_up_message(level),
                parse_mode=TELEGRAM_MARKDOWN_V2,
            )
        except Exception as e:
            logger.error(f"TG Notification error: {e}")
        finally:
            if should_close and bot:
                await bot.session.close()
