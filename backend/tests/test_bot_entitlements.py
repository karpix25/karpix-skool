from datetime import datetime, timedelta
import uuid

import pytest

from app.models import Tenant
from app.models_subscription import (
    SubscriptionLifecycleStatus,
    TenantPlan,
    TenantSubscription,
)
from app.services.bot_entitlements import can_activate_student


class FakeResult:
    def __init__(self, *, first_value=None, scalar_value=None):
        self.first_value = first_value
        self.scalar_value = scalar_value

    def first(self):
        return self.first_value

    def scalar_one(self):
        return self.scalar_value


class FakeSession:
    def __init__(self, results):
        self.results = list(results)

    async def execute(self, _statement):
        return self.results.pop(0)


def make_subscription(tenant_id, plan_id, status=SubscriptionLifecycleStatus.active):
    return TenantSubscription(
        tenant_id=tenant_id,
        plan_id=plan_id,
        status=status,
        current_period_end=datetime.utcnow() + timedelta(days=30),
    )


@pytest.mark.asyncio
async def test_student_activation_allowed_below_plan_limit():
    tenant = Tenant(id=uuid.uuid4(), name="School")
    plan = TenantPlan(code="trial", name="Trial", max_students=2)
    subscription = make_subscription(tenant.id, plan.id)
    session = FakeSession(
        [
            FakeResult(first_value=(subscription, plan)),
            FakeResult(scalar_value=1),
        ]
    )

    assert await can_activate_student(session, tenant) is True


@pytest.mark.asyncio
async def test_student_activation_rejected_at_plan_limit():
    tenant = Tenant(id=uuid.uuid4(), name="School")
    plan = TenantPlan(code="trial", name="Trial", max_students=2)
    subscription = make_subscription(tenant.id, plan.id)
    session = FakeSession(
        [
            FakeResult(first_value=(subscription, plan)),
            FakeResult(scalar_value=2),
        ]
    )

    assert await can_activate_student(session, tenant) is False


@pytest.mark.asyncio
async def test_student_activation_rejected_for_past_due_school():
    tenant = Tenant(id=uuid.uuid4(), name="School")
    plan = TenantPlan(code="trial", name="Trial", max_students=20)
    subscription = make_subscription(
        tenant.id,
        plan.id,
        status=SubscriptionLifecycleStatus.past_due,
    )
    session = FakeSession([FakeResult(first_value=(subscription, plan))])

    assert await can_activate_student(session, tenant) is False
