from dataclasses import dataclass
from datetime import datetime
import uuid

from sqlmodel import func, select
from sqlmodel.ext.asyncio.session import AsyncSession

from ..models import Course, MemberRole, MemberStatus, TenantMember
from ..models_subscription import TenantStorageUsage, TenantUsagePeriod


@dataclass(frozen=True)
class SubscriptionUsageSnapshot:
    courses_used: int = 0
    students_used: int = 0
    ai_jobs_used: int = 0
    storage_bytes_used: int = 0


async def get_subscription_usage(
    session: AsyncSession,
    tenant_id: uuid.UUID,
    *,
    now: datetime | None = None,
) -> SubscriptionUsageSnapshot:
    current_time = now or datetime.utcnow()
    courses_result = await session.exec(
        select(func.count(Course.id)).where(
            Course.tenant_id == tenant_id,
            Course.deleted_at == None,
        )
    )
    students_result = await session.exec(
        select(func.count(TenantMember.id)).where(
            TenantMember.tenant_id == tenant_id,
            TenantMember.role == MemberRole.student,
            TenantMember.status == MemberStatus.active,
            TenantMember.deleted_at == None,
        )
    )
    ai_result = await session.exec(
        select(TenantUsagePeriod.ai_jobs)
        .where(
            TenantUsagePeriod.tenant_id == tenant_id,
            TenantUsagePeriod.period_start <= current_time,
            TenantUsagePeriod.period_end > current_time,
        )
        .order_by(TenantUsagePeriod.period_start.desc())
        .limit(1)
    )
    storage_result = await session.exec(
        select(TenantStorageUsage.storage_bytes).where(
            TenantStorageUsage.tenant_id == tenant_id,
        )
    )
    return SubscriptionUsageSnapshot(
        courses_used=int(courses_result.one()),
        students_used=int(students_result.one()),
        ai_jobs_used=int(ai_result.first() or 0),
        storage_bytes_used=int(storage_result.first() or 0),
    )
