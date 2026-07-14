from dataclasses import dataclass
from datetime import datetime
import uuid

from ..models import SubscriptionStatus, Tenant, TenantSetupScope
from ..models_subscription import (
    SubscriptionLifecycleStatus,
    TenantSubscriptionEvent,
)
from .subscriptions import get_tenant_subscription, normalize_utc_naive
from .tenant_setup_tokens import revoke_active_setup_tokens


@dataclass(frozen=True)
class TenantArchiveResult:
    archived_at: datetime
    newly_archived: bool
    revoked_setup_tokens: int = 0


async def archive_tenant_data(
    session,
    *,
    tenant: Tenant,
    actor_user_id: uuid.UUID,
    now: datetime | None = None,
) -> TenantArchiveResult:
    """Archive a tenant without deleting its business or learning records."""
    if tenant.deleted_at:
        return TenantArchiveResult(
            archived_at=tenant.deleted_at,
            newly_archived=False,
        )

    archived_at = normalize_utc_naive(now or datetime.utcnow())
    revoked_setup_tokens = 0
    for scope in TenantSetupScope:
        revoked_setup_tokens += await revoke_active_setup_tokens(
            session,
            tenant_id=tenant.id,
            scope=scope,
            now=archived_at,
        )

    subscription, _plan = await get_tenant_subscription(session, tenant.id)
    if subscription and subscription.status != SubscriptionLifecycleStatus.canceled:
        previous_status = subscription.status
        subscription.status = SubscriptionLifecycleStatus.canceled
        subscription.updated_at = archived_at
        session.add(subscription)
        session.add(
            TenantSubscriptionEvent(
                tenant_id=tenant.id,
                subscription_id=subscription.id,
                event_type="subscription.tenant_archived",
                from_status=previous_status.value,
                to_status=SubscriptionLifecycleStatus.canceled.value,
                actor_user_id=actor_user_id,
                reason="Tenant archived by super admin",
                event_meta={"data_preserved": True},
                occurred_at=archived_at,
            )
        )

    tenant.deleted_at = archived_at
    tenant.updated_at = archived_at
    tenant.subscription_status = SubscriptionStatus.past_due
    tenant.setup_code = None
    session.add(tenant)

    return TenantArchiveResult(
        archived_at=archived_at,
        newly_archived=True,
        revoked_setup_tokens=revoked_setup_tokens,
    )
