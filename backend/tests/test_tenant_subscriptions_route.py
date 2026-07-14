import uuid
from datetime import datetime, timedelta
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest

from app.models_subscription import SubscriptionLifecycleStatus
from app.routes import tenant_subscriptions


@pytest.mark.asyncio
async def test_owner_subscription_includes_current_usage(monkeypatch):
    tenant_id = uuid.uuid4()
    tenant = SimpleNamespace(id=tenant_id, deleted_at=None)
    now = datetime.utcnow()
    subscription = SimpleNamespace(
        tenant_id=tenant_id,
        status=SubscriptionLifecycleStatus.trialing,
        current_period_start=now,
        current_period_end=None,
        trial_ends_at=now + timedelta(days=14),
    )
    plan = SimpleNamespace(
        id=uuid.uuid4(),
        code="pilot",
        name="Pilot",
        max_courses=5,
        max_students=100,
        max_ai_jobs_per_month=40,
        max_storage_bytes=1_073_741_824,
        trial_days=14,
    )
    usage = SimpleNamespace(
        courses_used=2,
        students_used=17,
        ai_jobs_used=4,
        storage_bytes_used=256,
    )
    session = AsyncMock()
    session.get.return_value = tenant
    monkeypatch.setattr(tenant_subscriptions, "ensure_tenant_access", AsyncMock())
    monkeypatch.setattr(
        tenant_subscriptions,
        "get_tenant_subscription",
        AsyncMock(return_value=(subscription, plan)),
    )
    monkeypatch.setattr(
        tenant_subscriptions,
        "get_subscription_usage",
        AsyncMock(return_value=usage),
    )

    response = await tenant_subscriptions.get_owner_subscription(
        tenant_id,
        SimpleNamespace(id=uuid.uuid4()),
        session,
    )

    assert response.plan.name == "Pilot"
    assert response.status == SubscriptionLifecycleStatus.trialing
    assert response.usage.courses_used == 2
    assert response.usage.students_used == 17
