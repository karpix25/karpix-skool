from datetime import datetime
from typing import Optional
import uuid

from ..models import SubscriptionStatus, Tenant
from ..models_subscription import (
    SubscriptionLifecycleStatus,
    TenantPlan,
    TenantSubscription,
    TenantSubscriptionEvent,
)
from .subscriptions import normalize_utc_naive


ALLOWED_SUBSCRIPTION_TRANSITIONS: dict[
    SubscriptionLifecycleStatus,
    frozenset[SubscriptionLifecycleStatus],
] = {
    SubscriptionLifecycleStatus.draft: frozenset({
        SubscriptionLifecycleStatus.trialing,
        SubscriptionLifecycleStatus.active,
        SubscriptionLifecycleStatus.canceled,
    }),
    SubscriptionLifecycleStatus.trialing: frozenset({
        SubscriptionLifecycleStatus.active,
        SubscriptionLifecycleStatus.past_due,
        SubscriptionLifecycleStatus.suspended,
        SubscriptionLifecycleStatus.canceled,
    }),
    SubscriptionLifecycleStatus.active: frozenset({
        SubscriptionLifecycleStatus.past_due,
        SubscriptionLifecycleStatus.suspended,
        SubscriptionLifecycleStatus.canceled,
    }),
    SubscriptionLifecycleStatus.past_due: frozenset({
        SubscriptionLifecycleStatus.active,
        SubscriptionLifecycleStatus.suspended,
        SubscriptionLifecycleStatus.canceled,
    }),
    SubscriptionLifecycleStatus.suspended: frozenset({
        SubscriptionLifecycleStatus.active,
        SubscriptionLifecycleStatus.past_due,
        SubscriptionLifecycleStatus.canceled,
    }),
    SubscriptionLifecycleStatus.canceled: frozenset({
        SubscriptionLifecycleStatus.draft,
    }),
}


class InvalidSubscriptionTransition(ValueError):
    def __init__(
        self,
        current: SubscriptionLifecycleStatus,
        target: SubscriptionLifecycleStatus,
    ):
        self.current = current
        self.target = target
        super().__init__(f"Subscription cannot transition from {current.value} to {target.value}")


def validate_subscription_transition(
    current: SubscriptionLifecycleStatus,
    target: SubscriptionLifecycleStatus,
) -> None:
    if target == current:
        return
    if target not in ALLOWED_SUBSCRIPTION_TRANSITIONS[current]:
        raise InvalidSubscriptionTransition(current, target)


def apply_manual_subscription_update(
    *,
    tenant: Tenant,
    subscription: TenantSubscription,
    current_plan: TenantPlan,
    target_plan: TenantPlan,
    requested_status: Optional[SubscriptionLifecycleStatus],
    requested_period_end: Optional[datetime],
    actor_user_id: uuid.UUID,
    reason: str,
    now: Optional[datetime] = None,
) -> Optional[TenantSubscriptionEvent]:
    target_status = requested_status or subscription.status
    validate_subscription_transition(subscription.status, target_status)

    normalized_end = (
        normalize_utc_naive(requested_period_end)
        if requested_period_end is not None
        else subscription.current_period_end
    )
    plan_changed = target_plan.id != subscription.plan_id
    status_changed = target_status != subscription.status
    period_changed = (
        requested_period_end is not None
        and normalized_end != subscription.current_period_end
    )
    if not (plan_changed or status_changed or period_changed):
        return None

    timestamp = normalize_utc_naive(now or datetime.utcnow())
    previous_status = subscription.status
    previous_end = subscription.current_period_end

    subscription.plan_id = target_plan.id
    subscription.status = target_status
    if period_changed:
        subscription.current_period_end = normalized_end
    if target_status == SubscriptionLifecycleStatus.trialing and (status_changed or period_changed):
        subscription.trial_ends_at = subscription.current_period_end
    subscription.activated_by_user_id = actor_user_id
    subscription.updated_at = timestamp

    tenant.subscription_status = (
        SubscriptionStatus.active
        if target_status in {
            SubscriptionLifecycleStatus.active,
            SubscriptionLifecycleStatus.trialing,
        }
        else SubscriptionStatus.past_due
    )
    tenant.expires_at = subscription.current_period_end
    tenant.updated_at = timestamp

    changed_fields = []
    if plan_changed:
        changed_fields.append("plan")
    if status_changed:
        changed_fields.append("status")
    if period_changed:
        changed_fields.append("current_period_end")

    return TenantSubscriptionEvent(
        tenant_id=tenant.id,
        subscription_id=subscription.id,
        event_type="subscription.manually_updated",
        from_status=previous_status.value,
        to_status=target_status.value,
        actor_user_id=actor_user_id,
        reason=reason,
        event_meta={
            "changed_fields": changed_fields,
            "from_plan_code": current_plan.code,
            "to_plan_code": target_plan.code,
            "from_period_end": previous_end.isoformat() if previous_end else None,
            "to_period_end": subscription.current_period_end.isoformat()
            if subscription.current_period_end
            else None,
        },
    )
