from dataclasses import dataclass
from typing import Iterable
import uuid

from sqlmodel import func, select
from sqlmodel.ext.asyncio.session import AsyncSession

from ..models import Course, TenantMember


@dataclass(frozen=True)
class TenantStats:
    member_count: int = 0
    course_count: int = 0


async def get_tenant_stats(session: AsyncSession, tenant_ids: Iterable[uuid.UUID]) -> dict[uuid.UUID, TenantStats]:
    ids = list(dict.fromkeys(tenant_ids))
    if not ids:
        return {}

    stats = {tenant_id: TenantStats() for tenant_id in ids}

    member_stmt = (
        select(TenantMember.tenant_id, func.count(TenantMember.id))
        .where(TenantMember.tenant_id.in_(ids))
        .group_by(TenantMember.tenant_id)
    )
    member_result = await session.exec(member_stmt)
    for tenant_id, count in member_result.all():
        current = stats[tenant_id]
        stats[tenant_id] = TenantStats(member_count=count, course_count=current.course_count)

    course_stmt = (
        select(Course.tenant_id, func.count(Course.id))
        .where(Course.tenant_id.in_(ids), Course.deleted_at == None)
        .group_by(Course.tenant_id)
    )
    course_result = await session.exec(course_stmt)
    for tenant_id, count in course_result.all():
        current = stats[tenant_id]
        stats[tenant_id] = TenantStats(member_count=current.member_count, course_count=count)

    return stats


async def get_tenant_stat(session: AsyncSession, tenant_id: uuid.UUID) -> TenantStats:
    return (await get_tenant_stats(session, [tenant_id]))[tenant_id]
