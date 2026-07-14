from datetime import datetime, timedelta
import uuid

import pytest

from app.models import SubscriptionStatus, Tenant
from app.models_subscription import (
    SubscriptionLifecycleStatus,
    TenantPlan,
    TenantSubscription,
)
from app.services.subscription_lifecycle import (
    ALLOWED_SUBSCRIPTION_TRANSITIONS,
    InvalidSubscriptionTransition,
    apply_manual_subscription_update,
    validate_subscription_transition,
)


def make_subscription_state(
    status: SubscriptionLifecycleStatus = SubscriptionLifecycleStatus.active,
):
    tenant = Tenant(name="School")
    plan = TenantPlan(code="start", name="Start")
    period_end = datetime(2026, 8, 1)
    subscription = TenantSubscription(
        tenant_id=tenant.id,
        plan_id=plan.id,
        status=status,
        current_period_end=period_end,
    )
    return tenant, plan, subscription


@pytest.mark.parametrize(
    ("current", "target"),
    [
        (current, target)
        for current, targets in ALLOWED_SUBSCRIPTION_TRANSITIONS.items()
        for target in targets
    ],
)
def test_declared_subscription_transitions_are_allowed(current, target):
    validate_subscription_transition(current, target)


def test_canceled_subscription_cannot_be_activated_directly():
    with pytest.raises(InvalidSubscriptionTransition):
        validate_subscription_transition(
            SubscriptionLifecycleStatus.canceled,
            SubscriptionLifecycleStatus.active,
        )


def test_identical_manual_update_is_a_true_noop():
    tenant, plan, subscription = make_subscription_state()
    actor_id = uuid.uuid4()
    original_subscription_updated_at = subscription.updated_at
    original_tenant_updated_at = tenant.updated_at

    event = apply_manual_subscription_update(
        tenant=tenant,
        subscription=subscription,
        current_plan=plan,
        target_plan=plan,
        requested_status=subscription.status,
        requested_period_end=subscription.current_period_end,
        actor_user_id=actor_id,
        reason="Повтор той же операции",
    )

    assert event is None
    assert subscription.updated_at == original_subscription_updated_at
    assert subscription.activated_by_user_id is None
    assert tenant.updated_at == original_tenant_updated_at


def test_manual_status_change_updates_legacy_state_and_returns_audit_event():
    tenant, plan, subscription = make_subscription_state()
    actor_id = uuid.uuid4()
    changed_at = datetime(2026, 7, 14, 10, 30)
    extended_end = subscription.current_period_end + timedelta(days=30)

    event = apply_manual_subscription_update(
        tenant=tenant,
        subscription=subscription,
        current_plan=plan,
        target_plan=plan,
        requested_status=SubscriptionLifecycleStatus.suspended,
        requested_period_end=extended_end,
        actor_user_id=actor_id,
        reason="Ручная приостановка",
        now=changed_at,
    )

    assert event is not None
    assert subscription.status == SubscriptionLifecycleStatus.suspended
    assert subscription.current_period_end == extended_end
    assert subscription.activated_by_user_id == actor_id
    assert subscription.updated_at == changed_at
    assert tenant.subscription_status == SubscriptionStatus.past_due
    assert tenant.expires_at == extended_end
    assert event.from_status == SubscriptionLifecycleStatus.active.value
    assert event.to_status == SubscriptionLifecycleStatus.suspended.value
    assert event.event_meta["changed_fields"] == ["status", "current_period_end"]
