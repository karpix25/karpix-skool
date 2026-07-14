from datetime import datetime
import uuid

import pytest
from fastapi import HTTPException

from app.models import Tenant, User
from app.models_subscription import (
    SubscriptionLifecycleStatus,
    TenantPlan,
    TenantSubscription,
)
from app.routes import super_subscriptions
from app.schemas.subscriptions import SubscriptionUpdate
from app.services.subscription_usage import SubscriptionUsageSnapshot


class SubscriptionUpdateSession:
    def __init__(self, tenant: Tenant):
        self.tenant = tenant
        self.added = []
        self.commit_count = 0

    async def get(self, model, item_id):
        if model is Tenant and item_id == self.tenant.id:
            return self.tenant
        return None

    def add(self, item):
        self.added.append(item)

    async def commit(self):
        self.commit_count += 1

    async def refresh(self, _item):
        return None


def make_subscription_state(status=SubscriptionLifecycleStatus.active):
    tenant = Tenant(name="School")
    plan = TenantPlan(code="start", name="Start")
    subscription = TenantSubscription(
        tenant_id=tenant.id,
        plan_id=plan.id,
        status=status,
        current_period_start=datetime(2026, 7, 1),
        current_period_end=datetime(2026, 8, 1),
    )
    return tenant, plan, subscription


def patch_subscription_dependencies(monkeypatch, subscription, plan):
    async def get_state(*_args, **_kwargs):
        return subscription, plan

    async def get_usage(*_args, **_kwargs):
        return SubscriptionUsageSnapshot(courses_used=2, students_used=18)

    monkeypatch.setattr(super_subscriptions, "get_tenant_subscription", get_state)
    monkeypatch.setattr(super_subscriptions, "get_subscription_usage", get_usage)


@pytest.mark.asyncio
async def test_identical_superadmin_patch_does_not_commit_or_add_event(monkeypatch):
    tenant, plan, subscription = make_subscription_state()
    session = SubscriptionUpdateSession(tenant)
    patch_subscription_dependencies(monkeypatch, subscription, plan)

    response = await super_subscriptions.update_subscription(
        tenant.id,
        SubscriptionUpdate(
            plan_code=plan.code,
            status=subscription.status,
            current_period_end=subscription.current_period_end,
            reason="Повтор той же операции",
        ),
        User(id=uuid.uuid4(), username="root", is_super_admin=True),
        session,
    )

    assert session.commit_count == 0
    assert session.added == []
    assert response.usage.courses_used == 2
    assert response.usage.students_used == 18


@pytest.mark.asyncio
async def test_invalid_superadmin_transition_returns_conflict(monkeypatch):
    tenant, plan, subscription = make_subscription_state(
        SubscriptionLifecycleStatus.canceled,
    )
    session = SubscriptionUpdateSession(tenant)
    patch_subscription_dependencies(monkeypatch, subscription, plan)

    with pytest.raises(HTTPException) as exc_info:
        await super_subscriptions.update_subscription(
            tenant.id,
            SubscriptionUpdate(
                status=SubscriptionLifecycleStatus.active,
                reason="Попытка повторной активации",
            ),
            User(id=uuid.uuid4(), username="root", is_super_admin=True),
            session,
        )

    assert exc_info.value.status_code == 409
    assert session.commit_count == 0
    assert session.added == []
