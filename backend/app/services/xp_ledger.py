from dataclasses import dataclass
from typing import Optional

from sqlalchemy.exc import IntegrityError
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from ..models import TenantMember, XPEvent


LEVEL_THRESHOLDS = {
    1: 0,
    2: 20,
    3: 100,
    4: 400,
    5: 1200,
    6: 4000,
    7: 10000,
    8: 25000,
    9: 60000,
}


@dataclass(frozen=True)
class XPAwardResult:
    event: Optional[XPEvent]
    granted: bool
    leveled_up: bool
    new_xp: int
    new_level: int


def level_for_xp(xp: int) -> int:
    for level, threshold in sorted(LEVEL_THRESHOLDS.items(), reverse=True):
        if xp >= threshold:
            return level
    return 1


class XPLedgerService:
    @staticmethod
    def build_idempotency_key(
        *,
        tenant_id: object,
        user_id: object,
        source_type: str,
        source_id: object,
    ) -> str:
        return f"{tenant_id}:{user_id}:{source_type}:{source_id}"

    @staticmethod
    async def get_event_by_key(
        session: AsyncSession,
        idempotency_key: str,
    ) -> Optional[XPEvent]:
        result = await session.exec(
            select(XPEvent).where(XPEvent.idempotency_key == idempotency_key)
        )
        return result.first()

    @staticmethod
    async def lock_member_for_award(
        session: AsyncSession,
        member: TenantMember,
    ) -> TenantMember:
        result = await session.exec(
            select(TenantMember)
            .where(TenantMember.id == member.id)
            .with_for_update()
        )
        return result.first() or member

    @staticmethod
    async def award_xp(
        *,
        session: AsyncSession,
        member: TenantMember,
        points: int,
        source_type: str,
        source_id: object,
        idempotency_key: Optional[str] = None,
    ) -> XPAwardResult:
        if points <= 0:
            raise ValueError("XP points must be positive")

        key = idempotency_key or XPLedgerService.build_idempotency_key(
            tenant_id=member.tenant_id,
            user_id=member.user_id,
            source_type=source_type,
            source_id=source_id,
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

        event = XPEvent(
            tenant_id=member.tenant_id,
            user_id=member.user_id,
            source_type=source_type,
            source_id=str(source_id),
            points=points,
            idempotency_key=key,
        )
        award_member = member
        old_xp = member.xp
        old_level = member.level

        try:
            async with session.begin_nested():
                award_member = await XPLedgerService.lock_member_for_award(session, member)
                old_xp = award_member.xp
                old_level = award_member.level
                award_member.xp = old_xp + points
                award_member.level = max(old_level, level_for_xp(award_member.xp))
                session.add(event)
                session.add(award_member)
                await session.flush()
        except IntegrityError:
            award_member.xp = old_xp
            award_member.level = old_level
            existing = await XPLedgerService.get_event_by_key(session, key)
            return XPAwardResult(
                event=existing,
                granted=False,
                leveled_up=False,
                new_xp=award_member.xp,
                new_level=award_member.level,
            )

        member.xp = award_member.xp
        member.level = award_member.level
        return XPAwardResult(
            event=event,
            granted=True,
            leveled_up=award_member.level > old_level,
            new_xp=award_member.xp,
            new_level=award_member.level,
        )
