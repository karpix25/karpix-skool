from dataclasses import dataclass
from typing import Iterable, Mapping, Optional
import uuid

from sqlmodel import func, select
from sqlmodel.ext.asyncio.session import AsyncSession

from ..models import Course, Lesson, MemberRole, MemberStatus, Module, Tenant, TenantMember


@dataclass(frozen=True)
class TenantOnboardingStatus:
    courses_count: int
    published_course_id: Optional[uuid.UUID]
    students_count: int


@dataclass(frozen=True)
class TenantLaunchStatus:
    stage: str
    has_telegram_group: bool
    published_course_id: Optional[uuid.UUID]
    students_count: int


async def get_tenant_onboarding_status(
    session: AsyncSession,
    tenant_id: uuid.UUID,
) -> TenantOnboardingStatus:
    courses_result = await session.exec(
        select(func.count(Course.id)).where(
            Course.tenant_id == tenant_id,
            Course.deleted_at == None,
        )
    )
    published_result = await session.exec(
        select(Course.id)
        .join(Module, Module.course_id == Course.id)
        .join(Lesson, Lesson.module_id == Module.id)
        .where(
            Course.tenant_id == tenant_id,
            Course.deleted_at == None,
            Course.is_published == True,
            Module.deleted_at == None,
            Lesson.deleted_at == None,
            Lesson.is_published == True,
        )
        .order_by(Course.created_at.asc())
        .limit(1)
    )
    students_result = await session.exec(
        select(func.count(TenantMember.id)).where(
            TenantMember.tenant_id == tenant_id,
            TenantMember.role == MemberRole.student,
            TenantMember.status == MemberStatus.active,
            TenantMember.deleted_at == None,
        )
    )
    return TenantOnboardingStatus(
        courses_count=courses_result.one(),
        published_course_id=published_result.first(),
        students_count=students_result.one(),
    )


async def get_tenant_launch_statuses(
    session: AsyncSession,
    tenants: Iterable[Tenant],
    course_counts: Mapping[uuid.UUID, int],
) -> dict[uuid.UUID, TenantLaunchStatus]:
    tenant_list = list(tenants)
    tenant_ids = [tenant.id for tenant in tenant_list]
    if not tenant_ids:
        return {}

    published_result = await session.exec(
        select(Course.tenant_id, Course.id)
        .join(Module, Module.course_id == Course.id)
        .join(Lesson, Lesson.module_id == Module.id)
        .where(
            Course.tenant_id.in_(tenant_ids),
            Course.deleted_at == None,
            Course.is_published == True,
            Module.deleted_at == None,
            Lesson.deleted_at == None,
            Lesson.is_published == True,
        )
        .order_by(Course.created_at.asc())
    )
    published_by_tenant: dict[uuid.UUID, uuid.UUID] = {}
    for tenant_id, course_id in published_result.all():
        published_by_tenant.setdefault(tenant_id, course_id)

    students_result = await session.exec(
        select(TenantMember.tenant_id, func.count(TenantMember.id))
        .where(
            TenantMember.tenant_id.in_(tenant_ids),
            TenantMember.role == MemberRole.student,
            TenantMember.status == MemberStatus.active,
            TenantMember.deleted_at == None,
        )
        .group_by(TenantMember.tenant_id)
    )
    students_by_tenant = dict(students_result.all())

    output = {}
    for tenant in tenant_list:
        has_group = bool(tenant.telegram_group_id or tenant.telegram_group_id_vip)
        published_course_id = published_by_tenant.get(tenant.id)
        students_count = int(students_by_tenant.get(tenant.id, 0))
        stage = _launch_stage(
            has_owner=tenant.owner_user_id is not None,
            has_group=has_group,
            courses_count=course_counts.get(tenant.id, 0),
            has_published_lesson=published_course_id is not None,
            students_count=students_count,
        )
        output[tenant.id] = TenantLaunchStatus(
            stage=stage,
            has_telegram_group=has_group,
            published_course_id=published_course_id,
            students_count=students_count,
        )
    return output


def _launch_stage(
    *,
    has_owner: bool,
    has_group: bool,
    courses_count: int,
    has_published_lesson: bool,
    students_count: int,
) -> str:
    if not has_owner:
        return "invited"
    if not has_group:
        return "owner_claimed"
    if courses_count <= 0:
        return "group_connected"
    if not has_published_lesson:
        return "course_created"
    if students_count <= 0:
        return "lesson_published"
    return "launched"
