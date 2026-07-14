from dataclasses import dataclass
from typing import Iterable, Mapping, Optional
import uuid
from urllib.parse import urlparse

from sqlmodel import func, select
from sqlmodel.ext.asyncio.session import AsyncSession

from ..models import (
    Course,
    Lesson,
    MemberRole,
    MemberStatus,
    Module,
    SuperActivityEvent,
    Tenant,
    TenantMember,
)
from .subscriptions import build_entitlement, get_tenant_subscription


STUDENT_PREVIEW_EVENT = "school.student_preview_confirmed"
ONBOARDING_COMPLETED_EVENT = "school.onboarding_completed"
MIN_SCHOOL_DESCRIPTION_LENGTH = 20


@dataclass(frozen=True)
class TenantOnboardingStatus:
    courses_count: int
    published_course_id: Optional[uuid.UUID]
    students_count: int
    has_student_preview: bool
    is_completed: bool


@dataclass(frozen=True)
class TenantLaunchStatus:
    stage: str
    has_telegram_group: bool
    published_course_id: Optional[uuid.UUID]
    students_count: int
    has_student_preview: bool


@dataclass(frozen=True)
class TenantOnboardingReadinessFacts:
    has_school_profile: bool
    has_serving_subscription: bool


def has_ready_school_profile(tenant: Tenant) -> bool:
    description = (tenant.description or "").strip()
    support_url = (tenant.support_url or "").strip()
    if len(description) < MIN_SCHOOL_DESCRIPTION_LENGTH or not support_url:
        return False
    parsed_support = urlparse(support_url)
    return bool(
        parsed_support.scheme == "https"
        and parsed_support.hostname
        and not parsed_support.username
        and not parsed_support.password
    )


async def get_tenant_onboarding_readiness_facts(
    session: AsyncSession,
    tenant: Tenant,
) -> TenantOnboardingReadinessFacts:
    subscription, plan = await get_tenant_subscription(session, tenant.id)
    has_serving_subscription = bool(
        subscription
        and plan
        and build_entitlement(subscription, plan).is_write_allowed
    )
    return TenantOnboardingReadinessFacts(
        has_school_profile=has_ready_school_profile(tenant),
        has_serving_subscription=has_serving_subscription,
    )


async def _onboarding_event_types(
    session: AsyncSession,
    tenant_id: uuid.UUID,
) -> set[str]:
    result = await session.exec(
        select(SuperActivityEvent.event_type).where(
            SuperActivityEvent.tenant_id == tenant_id,
            SuperActivityEvent.event_type.in_((STUDENT_PREVIEW_EVENT, ONBOARDING_COMPLETED_EVENT)),
        )
    )
    return set(result.all())


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
    event_types = await _onboarding_event_types(session, tenant_id)
    return TenantOnboardingStatus(
        courses_count=courses_result.one(),
        published_course_id=published_result.first(),
        students_count=students_result.one(),
        has_student_preview=STUDENT_PREVIEW_EVENT in event_types,
        is_completed=ONBOARDING_COMPLETED_EVENT in event_types,
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

    events_result = await session.exec(
        select(SuperActivityEvent.tenant_id, SuperActivityEvent.event_type).where(
            SuperActivityEvent.tenant_id.in_(tenant_ids),
            SuperActivityEvent.event_type == STUDENT_PREVIEW_EVENT,
        )
    )
    previewed_tenant_ids = {tenant_id for tenant_id, _event_type in events_result.all()}

    output = {}
    for tenant in tenant_list:
        has_group = bool(tenant.telegram_group_id or tenant.telegram_group_id_vip)
        published_course_id = published_by_tenant.get(tenant.id)
        students_count = int(students_by_tenant.get(tenant.id, 0))
        has_student_preview = tenant.id in previewed_tenant_ids
        stage = _launch_stage(
            has_owner=tenant.owner_user_id is not None,
            has_group=has_group,
            courses_count=course_counts.get(tenant.id, 0),
            has_published_lesson=published_course_id is not None,
            students_count=students_count,
            has_student_preview=has_student_preview,
        )
        output[tenant.id] = TenantLaunchStatus(
            stage=stage,
            has_telegram_group=has_group,
            published_course_id=published_course_id,
            students_count=students_count,
            has_student_preview=has_student_preview,
        )
    return output


def _launch_stage(
    *,
    has_owner: bool,
    has_group: bool,
    courses_count: int,
    has_published_lesson: bool,
    students_count: int,
    has_student_preview: bool,
) -> str:
    if not has_owner:
        return "invited"
    if not has_group:
        return "owner_claimed"
    if courses_count <= 0:
        return "group_connected"
    if not has_published_lesson:
        return "course_created"
    if not has_student_preview or students_count <= 0:
        return "lesson_published"
    return "launched"
