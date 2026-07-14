from dataclasses import dataclass
from datetime import datetime
from enum import Enum
import uuid

from sqlalchemy.future import select

from app.models import Tenant, TenantSetupScope, TenantSetupToken


class OwnerInviteLifecycleStatus(str, Enum):
    not_issued = "not_issued"
    active = "active"
    expired = "expired"
    claimed = "claimed"
    revoked = "revoked"


@dataclass(frozen=True)
class OwnerInviteStatus:
    tenant_id: uuid.UUID
    status: OwnerInviteLifecycleStatus
    expires_at: datetime | None = None
    created_at: datetime | None = None
    revoked_at: datetime | None = None


def owner_invite_status_from_record(
    tenant: Tenant,
    record: TenantSetupToken | None,
    *,
    now: datetime | None = None,
) -> OwnerInviteStatus:
    current_time = now or datetime.utcnow()
    if tenant.owner_user_id is not None:
        return OwnerInviteStatus(
            tenant_id=tenant.id,
            status=OwnerInviteLifecycleStatus.claimed,
            expires_at=record.expires_at if record else None,
            created_at=record.created_at if record else None,
        )
    if record is None:
        return OwnerInviteStatus(
            tenant_id=tenant.id,
            status=OwnerInviteLifecycleStatus.not_issued,
        )
    if record.used_at is not None:
        return OwnerInviteStatus(
            tenant_id=tenant.id,
            status=OwnerInviteLifecycleStatus.revoked,
            expires_at=record.expires_at,
            created_at=record.created_at,
            revoked_at=record.used_at,
        )
    if record.expires_at <= current_time:
        return OwnerInviteStatus(
            tenant_id=tenant.id,
            status=OwnerInviteLifecycleStatus.expired,
            expires_at=record.expires_at,
            created_at=record.created_at,
        )
    return OwnerInviteStatus(
        tenant_id=tenant.id,
        status=OwnerInviteLifecycleStatus.active,
        expires_at=record.expires_at,
        created_at=record.created_at,
    )


async def get_owner_invite_status(
    session,
    tenant: Tenant,
    *,
    now: datetime | None = None,
) -> OwnerInviteStatus:
    result = await session.execute(
        select(TenantSetupToken)
        .where(
            TenantSetupToken.tenant_id == tenant.id,
            TenantSetupToken.scope == TenantSetupScope.owner_invite,
        )
        .order_by(TenantSetupToken.created_at.desc())
        .limit(1)
    )
    return owner_invite_status_from_record(
        tenant,
        result.scalars().first(),
        now=now,
    )
