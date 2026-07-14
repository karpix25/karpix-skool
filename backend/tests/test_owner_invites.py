from datetime import datetime, timedelta
import uuid

from app.models import Tenant, TenantSetupScope, TenantSetupToken
from app.services.owner_invites import (
    OwnerInviteLifecycleStatus,
    owner_invite_status_from_record,
)


def make_token(tenant: Tenant, *, now: datetime, used_at=None):
    return TenantSetupToken(
        tenant_id=tenant.id,
        token_hash="a" * 64,
        scope=TenantSetupScope.owner_invite,
        expires_at=now + timedelta(days=1),
        used_at=used_at,
        created_at=now,
    )


def test_owner_invite_status_is_derived_from_persisted_token_state():
    now = datetime(2026, 7, 14, 12, 0)
    tenant = Tenant(name="School")
    active = make_token(tenant, now=now)

    assert owner_invite_status_from_record(
        tenant,
        active,
        now=now,
    ).status == OwnerInviteLifecycleStatus.active

    expired = make_token(tenant, now=now - timedelta(days=2))
    assert owner_invite_status_from_record(
        tenant,
        expired,
        now=now,
    ).status == OwnerInviteLifecycleStatus.expired

    revoked_at = now - timedelta(hours=1)
    revoked = make_token(tenant, now=now, used_at=revoked_at)
    revoked_status = owner_invite_status_from_record(tenant, revoked, now=now)
    assert revoked_status.status == OwnerInviteLifecycleStatus.revoked
    assert revoked_status.revoked_at == revoked_at


def test_owner_assignment_marks_invite_claimed_without_exposing_a_secret():
    now = datetime(2026, 7, 14, 12, 0)
    tenant = Tenant(name="School", owner_user_id=uuid.uuid4())
    token = make_token(tenant, now=now, used_at=now - timedelta(hours=1))

    status = owner_invite_status_from_record(tenant, token, now=now)

    assert status.status == OwnerInviteLifecycleStatus.claimed
    assert not hasattr(status, "token")
