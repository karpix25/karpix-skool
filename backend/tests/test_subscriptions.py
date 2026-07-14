from datetime import datetime, timedelta
import uuid

import pytest
from fastapi import HTTPException

from app.models import SubscriptionStatus, Tenant
from app.models_subscription import (
    SubscriptionLifecycleStatus,
    TenantPlan,
    TenantSubscription,
)
from app.services.subscriptions import (
    build_entitlement,
    build_legacy_entitlement,
    ensure_course_capacity,
    ensure_student_capacity,
    ensure_tenant_ai_entitlement,
    release_storage_bytes,
    reserve_ai_job,
    reserve_storage_bytes,
)


def make_plan() -> TenantPlan:
    return TenantPlan(
        code="trial",
        name="Trial",
        max_courses=1,
        max_students=20,
        max_ai_jobs_per_month=20,
        max_storage_bytes=1024,
        trial_days=7,
    )


def make_subscription(status, *, end):
    return TenantSubscription(
        tenant_id=uuid.uuid4(),
        plan_id=uuid.uuid4(),
        status=status,
        current_period_end=end,
        trial_ends_at=end if status == SubscriptionLifecycleStatus.trialing else None,
    )


def test_active_subscription_allows_write_and_ai():
    now = datetime.utcnow()
    entitlement = build_entitlement(
        make_subscription(
            SubscriptionLifecycleStatus.active,
            end=now + timedelta(days=30),
        ),
        make_plan(),
        now=now,
    )

    assert entitlement.is_write_allowed is True
    assert entitlement.is_ai_allowed is True
    assert entitlement.blocking_reason is None


def test_expired_trial_blocks_write_and_ai():
    now = datetime.utcnow()
    entitlement = build_entitlement(
        make_subscription(
            SubscriptionLifecycleStatus.trialing,
            end=now - timedelta(seconds=1),
        ),
        make_plan(),
        now=now,
    )

    assert entitlement.is_write_allowed is False
    assert entitlement.is_ai_allowed is False
    assert entitlement.blocking_reason == "subscription_expired"


def test_past_due_blocks_even_before_period_end():
    now = datetime.utcnow()
    entitlement = build_entitlement(
        make_subscription(
            SubscriptionLifecycleStatus.past_due,
            end=now + timedelta(days=3),
        ),
        make_plan(),
        now=now,
    )

    assert entitlement.is_write_allowed is False
    assert entitlement.blocking_reason == "subscription_past_due"


@pytest.mark.parametrize(
    "status",
    [
        SubscriptionLifecycleStatus.draft,
        SubscriptionLifecycleStatus.suspended,
        SubscriptionLifecycleStatus.canceled,
    ],
)
def test_non_serving_subscription_statuses_block_write_and_ai(status):
    now = datetime.utcnow()

    entitlement = build_entitlement(
        make_subscription(status, end=now + timedelta(days=30)),
        make_plan(),
        now=now,
    )

    assert entitlement.is_write_allowed is False
    assert entitlement.is_ai_allowed is False
    assert entitlement.blocking_reason == f"subscription_{status.value}"


def test_legacy_entitlement_remains_compatible_during_migration():
    tenant = Tenant(name="Legacy", subscription_status=SubscriptionStatus.active)

    entitlement = build_legacy_entitlement(tenant)

    assert entitlement.status == SubscriptionLifecycleStatus.active
    assert entitlement.is_write_allowed is True


class FakeSession:
    async def exec(self, _statement):
        return FakeResult()


class FakeResult:
    def first(self):
        return None


@pytest.mark.asyncio
async def test_ai_guard_rejects_expired_legacy_tenant_before_provider_call():
    tenant = Tenant(
        name="Expired",
        subscription_status=SubscriptionStatus.active,
        expires_at=datetime.utcnow() - timedelta(minutes=1),
    )

    with pytest.raises(HTTPException) as exc_info:
        await ensure_tenant_ai_entitlement(FakeSession(), tenant)

    assert exc_info.value.status_code == 402


class QuotaResult:
    def __init__(self, *, first_value=None, one_value=None):
        self.first_value = first_value
        self.one_value = one_value

    def first(self):
        return self.first_value

    def one(self):
        return self.one_value


class QuotaSession:
    def __init__(self, results):
        self.results = list(results)
        self.commits = 0

    async def exec(self, _statement):
        return self.results.pop(0)

    async def commit(self):
        self.commits += 1


def quota_context(*, courses=1, students=1, ai_jobs=1, storage_bytes=1024):
    tenant = Tenant(id=uuid.uuid4(), name="Quota School")
    plan = TenantPlan(
        code="limited",
        name="Limited",
        max_courses=courses,
        max_students=students,
        max_ai_jobs_per_month=ai_jobs,
        max_storage_bytes=storage_bytes,
    )
    subscription = TenantSubscription(
        tenant_id=tenant.id,
        plan_id=plan.id,
        status=SubscriptionLifecycleStatus.active,
        current_period_end=datetime.utcnow() + timedelta(days=30),
    )
    return tenant, plan, subscription


@pytest.mark.asyncio
async def test_course_quota_rejects_creation_at_plan_limit():
    tenant, plan, subscription = quota_context(courses=1)
    session = QuotaSession(
        [
            QuotaResult(first_value=(subscription, plan)),
            QuotaResult(one_value=1),
        ]
    )

    with pytest.raises(HTTPException) as exc_info:
        await ensure_course_capacity(session, tenant)

    assert exc_info.value.status_code == 409


@pytest.mark.asyncio
async def test_student_quota_rejects_activation_at_plan_limit():
    tenant, plan, subscription = quota_context(students=20)
    session = QuotaSession(
        [
            QuotaResult(first_value=(subscription, plan)),
            QuotaResult(one_value=20),
        ]
    )

    with pytest.raises(HTTPException) as exc_info:
        await ensure_student_capacity(session, tenant)

    assert exc_info.value.status_code == 409


@pytest.mark.asyncio
async def test_ai_quota_rejects_zero_limit_without_reservation_commit():
    tenant, plan, subscription = quota_context(ai_jobs=0)
    session = QuotaSession([QuotaResult(first_value=(subscription, plan))])

    with pytest.raises(HTTPException) as exc_info:
        await reserve_ai_job(session, tenant)

    assert exc_info.value.status_code == 429
    assert session.commits == 0


@pytest.mark.asyncio
async def test_storage_quota_rejects_file_larger_than_plan_without_commit():
    tenant, plan, subscription = quota_context(storage_bytes=100)
    session = QuotaSession([QuotaResult(first_value=(subscription, plan))])

    with pytest.raises(HTTPException) as exc_info:
        await reserve_storage_bytes(session, tenant, 101)

    assert exc_info.value.status_code == 409
    assert session.commits == 0


@pytest.mark.asyncio
async def test_storage_quota_reservation_is_committed_atomically():
    tenant, plan, subscription = quota_context(storage_bytes=100)
    session = QuotaSession(
        [
            QuotaResult(first_value=(subscription, plan)),
            QuotaResult(first_value=75),
        ]
    )

    total = await reserve_storage_bytes(session, tenant, 25)

    assert total == 75
    assert session.commits == 1


@pytest.mark.asyncio
async def test_storage_quota_conflict_does_not_commit():
    tenant, plan, subscription = quota_context(storage_bytes=100)
    session = QuotaSession(
        [
            QuotaResult(first_value=(subscription, plan)),
            QuotaResult(first_value=None),
        ]
    )

    with pytest.raises(HTTPException) as exc_info:
        await reserve_storage_bytes(session, tenant, 25)

    assert exc_info.value.status_code == 409
    assert session.commits == 0


@pytest.mark.asyncio
async def test_storage_release_commits_usage_decrement():
    session = QuotaSession([QuotaResult()])

    await release_storage_bytes(session, uuid.uuid4(), 25)

    assert session.commits == 1
