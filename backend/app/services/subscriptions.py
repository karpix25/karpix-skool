from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Optional
import uuid

from fastapi import HTTPException
from sqlmodel import func, select
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy import update

from ..models import (
    Course,
    Lesson,
    MemberRole,
    MemberStatus,
    Module,
    SubscriptionStatus,
    Tenant,
    TenantMember,
)
from ..models_subscription import (
    SubscriptionLifecycleStatus,
    TenantPlan,
    TenantSubscription,
    TenantSubscriptionEvent,
    TenantStorageUsage,
    TenantUsagePeriod,
)


SUBSCRIPTION_WRITE_BLOCKED = "School subscription does not allow changes."
SUBSCRIPTION_AI_BLOCKED = "School subscription does not allow AI generation."


@dataclass(frozen=True)
class TenantEntitlement:
    status: SubscriptionLifecycleStatus
    plan: Optional[TenantPlan]
    current_period_end: Optional[datetime]
    trial_ends_at: Optional[datetime]
    is_write_allowed: bool
    is_ai_allowed: bool
    blocking_reason: Optional[str]


def _effective_end(subscription: TenantSubscription) -> Optional[datetime]:
    if subscription.status == SubscriptionLifecycleStatus.trialing:
        return subscription.trial_ends_at
    return subscription.current_period_end


def _is_expired(end: Optional[datetime], now: datetime) -> bool:
    return end is not None and normalize_utc_naive(end) <= normalize_utc_naive(now)


def normalize_utc_naive(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value
    return value.astimezone(timezone.utc).replace(tzinfo=None)


def build_entitlement(
    subscription: TenantSubscription,
    plan: TenantPlan,
    *,
    now: Optional[datetime] = None,
) -> TenantEntitlement:
    current_time = normalize_utc_naive(now or datetime.utcnow())
    effective_end = _effective_end(subscription)
    status_allows_write = subscription.status in {
        SubscriptionLifecycleStatus.trialing,
        SubscriptionLifecycleStatus.active,
    }
    expired = _is_expired(effective_end, current_time)
    allowed = status_allows_write and not expired

    reason = None
    if expired:
        reason = "subscription_expired"
    elif not status_allows_write:
        reason = f"subscription_{subscription.status.value}"

    return TenantEntitlement(
        status=subscription.status,
        plan=plan,
        current_period_end=subscription.current_period_end,
        trial_ends_at=subscription.trial_ends_at,
        is_write_allowed=allowed,
        is_ai_allowed=allowed,
        blocking_reason=reason,
    )


async def get_tenant_subscription(
    session: AsyncSession,
    tenant_id: uuid.UUID,
) -> tuple[Optional[TenantSubscription], Optional[TenantPlan]]:
    statement = (
        select(TenantSubscription, TenantPlan)
        .join(TenantPlan, TenantPlan.id == TenantSubscription.plan_id)
        .where(TenantSubscription.tenant_id == tenant_id)
    )
    result = await session.exec(statement)
    row = result.first()
    if not row:
        return None, None
    return row


def build_legacy_entitlement(tenant: Tenant, *, now: Optional[datetime] = None) -> TenantEntitlement:
    current_time = normalize_utc_naive(now or datetime.utcnow())
    is_active = tenant.subscription_status == SubscriptionStatus.active
    expired = _is_expired(tenant.expires_at, current_time)
    allowed = is_active and not expired
    reason = "subscription_expired" if expired else None
    if not is_active:
        reason = "subscription_past_due"
    return TenantEntitlement(
        status=(
            SubscriptionLifecycleStatus.active
            if is_active
            else SubscriptionLifecycleStatus.past_due
        ),
        plan=None,
        current_period_end=tenant.expires_at,
        trial_ends_at=None,
        is_write_allowed=allowed,
        is_ai_allowed=allowed,
        blocking_reason=reason,
    )


async def resolve_tenant_entitlement(
    session: AsyncSession,
    tenant: Tenant,
    *,
    now: Optional[datetime] = None,
) -> TenantEntitlement:
    subscription, plan = await get_tenant_subscription(session, tenant.id)
    if not subscription or not plan:
        return build_legacy_entitlement(tenant, now=now)
    return build_entitlement(subscription, plan, now=now)


async def ensure_tenant_write_entitlement(
    session: AsyncSession,
    tenant: Tenant,
) -> TenantEntitlement:
    entitlement = await resolve_tenant_entitlement(session, tenant)
    if not entitlement.is_write_allowed:
        raise HTTPException(status_code=402, detail=SUBSCRIPTION_WRITE_BLOCKED)
    return entitlement


async def ensure_tenant_ai_entitlement(
    session: AsyncSession,
    tenant: Tenant,
) -> TenantEntitlement:
    entitlement = await resolve_tenant_entitlement(session, tenant)
    if not entitlement.is_ai_allowed:
        raise HTTPException(status_code=402, detail=SUBSCRIPTION_AI_BLOCKED)
    return entitlement


def _usage_period(entitlement: TenantEntitlement, now: datetime) -> tuple[datetime, datetime]:
    period_end = entitlement.current_period_end
    if period_end and period_end > now:
        period_start = datetime(now.year, now.month, 1)
        return period_start, period_end
    period_start = datetime(now.year, now.month, 1)
    if now.month == 12:
        return period_start, datetime(now.year + 1, 1, 1)
    return period_start, datetime(now.year, now.month + 1, 1)


async def reserve_ai_job(
    session: AsyncSession,
    tenant: Tenant,
    *,
    now: Optional[datetime] = None,
) -> int:
    entitlement = await ensure_tenant_ai_entitlement(session, tenant)
    if not entitlement.plan:
        return 0

    limit = entitlement.plan.max_ai_jobs_per_month
    if limit <= 0:
        raise HTTPException(status_code=429, detail="AI job limit reached for this plan.")

    current_time = now or datetime.utcnow()
    period_start, period_end = _usage_period(entitlement, current_time)
    statement = (
        insert(TenantUsagePeriod)
        .values(
            id=uuid.uuid4(),
            tenant_id=tenant.id,
            period_start=period_start,
            period_end=period_end,
            ai_jobs=1,
            storage_bytes=0,
            created_at=current_time,
            updated_at=current_time,
        )
        .on_conflict_do_update(
            constraint="uq_tenantusageperiod_tenant_period",
            set_={
                "ai_jobs": TenantUsagePeriod.ai_jobs + 1,
                "updated_at": current_time,
            },
            where=TenantUsagePeriod.ai_jobs < limit,
        )
        .returning(TenantUsagePeriod.ai_jobs)
    )
    result = await session.exec(statement)
    reserved_count = result.first()
    if reserved_count is None:
        raise HTTPException(status_code=429, detail="AI job limit reached for this plan.")
    await session.commit()
    return int(reserved_count)


async def reserve_storage_bytes(
    session: AsyncSession,
    tenant: Tenant,
    byte_count: int,
) -> int:
    if byte_count <= 0:
        return 0
    entitlement = await ensure_tenant_write_entitlement(session, tenant)
    if not entitlement.plan:
        return 0

    limit = entitlement.plan.max_storage_bytes
    if limit <= 0 or byte_count > limit:
        raise HTTPException(status_code=409, detail="Storage limit reached for this plan.")
    current_time = datetime.utcnow()
    statement = (
        insert(TenantStorageUsage)
        .values(
            id=uuid.uuid4(),
            tenant_id=tenant.id,
            storage_bytes=byte_count,
            created_at=current_time,
            updated_at=current_time,
        )
        .on_conflict_do_update(
            constraint="uq_tenantstorageusage_tenant",
            set_={
                "storage_bytes": TenantStorageUsage.storage_bytes + byte_count,
                "updated_at": current_time,
            },
            where=TenantStorageUsage.storage_bytes + byte_count <= limit,
        )
        .returning(TenantStorageUsage.storage_bytes)
    )
    result = await session.exec(statement)
    reserved_total = result.first()
    if reserved_total is None:
        raise HTTPException(status_code=409, detail="Storage limit reached for this plan.")
    await session.commit()
    return int(reserved_total)


async def release_storage_bytes(
    session: AsyncSession,
    tenant_id: uuid.UUID,
    byte_count: int,
) -> None:
    if byte_count <= 0:
        return
    statement = (
        update(TenantStorageUsage)
        .where(TenantStorageUsage.tenant_id == tenant_id)
        .values(
            storage_bytes=func.greatest(TenantStorageUsage.storage_bytes - byte_count, 0),
            updated_at=datetime.utcnow(),
        )
    )
    await session.exec(statement)
    await session.commit()


async def ensure_course_capacity(
    session: AsyncSession,
    tenant: Tenant,
) -> None:
    entitlement = await ensure_tenant_write_entitlement(session, tenant)
    if not entitlement.plan:
        return
    result = await session.exec(
        select(func.count(Course.id)).where(
            Course.tenant_id == tenant.id,
            Course.deleted_at == None,
        )
    )
    if result.one() >= entitlement.plan.max_courses:
        raise HTTPException(status_code=409, detail="Course limit reached for this plan.")


async def ensure_student_capacity(
    session: AsyncSession,
    tenant: Tenant,
) -> None:
    entitlement = await resolve_tenant_entitlement(session, tenant)
    if not entitlement.is_write_allowed:
        raise HTTPException(status_code=402, detail=SUBSCRIPTION_WRITE_BLOCKED)
    if not entitlement.plan:
        return
    result = await session.exec(
        select(func.count(TenantMember.id)).where(
            TenantMember.tenant_id == tenant.id,
            TenantMember.role == MemberRole.student,
            TenantMember.status == MemberStatus.active,
            TenantMember.deleted_at == None,
        )
    )
    if result.one() >= entitlement.plan.max_students:
        raise HTTPException(status_code=409, detail="Student limit reached for this plan.")


async def ensure_lesson_write_entitlement(
    session: AsyncSession,
    lesson: Lesson,
) -> Tenant:
    module = await session.get(Module, lesson.module_id)
    if not module or module.deleted_at:
        raise HTTPException(status_code=404, detail="Module context not found")
    course = await session.get(Course, module.course_id)
    if not course or course.deleted_at:
        raise HTTPException(status_code=404, detail="Course context not found")
    tenant = await session.get(Tenant, course.tenant_id)
    if not tenant or tenant.deleted_at:
        raise HTTPException(status_code=404, detail="Tenant not found")
    await ensure_tenant_write_entitlement(session, tenant)
    return tenant


async def create_trial_subscription(
    session: AsyncSession,
    tenant_id: uuid.UUID,
    *,
    plan_code: str = "trial",
    now: Optional[datetime] = None,
) -> TenantSubscription:
    existing, _plan = await get_tenant_subscription(session, tenant_id)
    if existing:
        return existing

    plan_result = await session.exec(
        select(TenantPlan).where(TenantPlan.code == plan_code, TenantPlan.is_active == True)
    )
    plan = plan_result.first()
    if not plan:
        raise RuntimeError(f"Active subscription plan '{plan_code}' is not configured")

    current_time = now or datetime.utcnow()
    trial_end = current_time + timedelta(days=plan.trial_days)
    subscription = TenantSubscription(
        tenant_id=tenant_id,
        plan_id=plan.id,
        status=SubscriptionLifecycleStatus.trialing,
        started_at=current_time,
        current_period_start=current_time,
        current_period_end=trial_end,
        trial_ends_at=trial_end,
    )
    session.add(subscription)
    await session.flush()
    session.add(
        TenantSubscriptionEvent(
            tenant_id=tenant_id,
            subscription_id=subscription.id,
            event_type="subscription.trial_started",
            to_status=subscription.status.value,
            event_meta={"plan_code": plan.code},
        )
    )
    return subscription
