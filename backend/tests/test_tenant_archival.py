from datetime import datetime, timedelta
import uuid

import pytest

from app.models import SubscriptionStatus, Tenant, TenantSetupScope, User
from app.models_subscription import (
    SubscriptionLifecycleStatus,
    TenantPlan,
    TenantSubscription,
    TenantSubscriptionEvent,
)
from app.routes import super_admin
from app.services import tenant_archival
from app.services.tenant_archival import TenantArchiveResult, archive_tenant_data


class FakeSession:
    def __init__(self, tenant: Tenant):
        self.tenant = tenant
        self.added = []
        self.commits = 0

    async def get(self, _model, _item_id):
        return self.tenant

    async def exec(self, _statement):
        return FakeResult(self.tenant)

    def add(self, item):
        self.added.append(item)

    async def commit(self):
        self.commits += 1

    async def delete(self, _item):
        raise AssertionError("Archival must never physically delete tenant data")


class FakeResult:
    def __init__(self, value):
        self.value = value

    def first(self):
        return self.value


@pytest.mark.asyncio
async def test_archive_preserves_tenant_and_revokes_all_setup_scopes(monkeypatch):
    archived_at = datetime(2026, 7, 14, 12, 0, 0)
    actor_id = uuid.uuid4()
    tenant = Tenant(id=uuid.uuid4(), name="School", setup_code="legacy")
    plan = TenantPlan(code="pro", name="Pro")
    subscription = TenantSubscription(
        tenant_id=tenant.id,
        plan_id=plan.id,
        status=SubscriptionLifecycleStatus.active,
        current_period_end=archived_at + timedelta(days=30),
    )
    session = FakeSession(tenant)
    revoked_scopes = []

    async def fake_revoke(_session, *, tenant_id, scope, now):
        assert tenant_id == tenant.id
        assert now == archived_at
        revoked_scopes.append(scope)
        return 1

    async def fake_subscription(_session, tenant_id):
        assert tenant_id == tenant.id
        return subscription, plan

    monkeypatch.setattr(tenant_archival, "revoke_active_setup_tokens", fake_revoke)
    monkeypatch.setattr(tenant_archival, "get_tenant_subscription", fake_subscription)

    result = await archive_tenant_data(
        session,
        tenant=tenant,
        actor_user_id=actor_id,
        now=archived_at,
    )

    assert result.newly_archived is True
    assert result.revoked_setup_tokens == len(TenantSetupScope)
    assert revoked_scopes == list(TenantSetupScope)
    assert tenant.deleted_at == archived_at
    assert tenant.subscription_status == SubscriptionStatus.past_due
    assert tenant.setup_code is None
    assert subscription.status == SubscriptionLifecycleStatus.canceled
    event = next(item for item in session.added if isinstance(item, TenantSubscriptionEvent))
    assert event.event_type == "subscription.tenant_archived"
    assert event.from_status == SubscriptionLifecycleStatus.active.value
    assert event.to_status == SubscriptionLifecycleStatus.canceled.value
    assert event.event_meta == {"data_preserved": True}


@pytest.mark.asyncio
async def test_archive_is_idempotent_and_skips_side_effects(monkeypatch):
    archived_at = datetime(2026, 7, 14, 12, 0, 0)
    tenant = Tenant(id=uuid.uuid4(), name="School", deleted_at=archived_at)
    session = FakeSession(tenant)

    async def unexpected(*_args, **_kwargs):
        raise AssertionError("Repeated archive must not repeat side effects")

    monkeypatch.setattr(tenant_archival, "revoke_active_setup_tokens", unexpected)
    monkeypatch.setattr(tenant_archival, "get_tenant_subscription", unexpected)

    result = await archive_tenant_data(
        session,
        tenant=tenant,
        actor_user_id=uuid.uuid4(),
    )

    assert result == TenantArchiveResult(
        archived_at=archived_at,
        newly_archived=False,
        revoked_setup_tokens=0,
    )
    assert session.added == []


@pytest.mark.asyncio
async def test_super_admin_archive_records_one_focused_audit_event(monkeypatch):
    archived_at = datetime(2026, 7, 14, 12, 0, 0)
    tenant = Tenant(id=uuid.uuid4(), name="School")
    super_user = User(id=uuid.uuid4(), username="root", is_super_admin=True)
    session = FakeSession(tenant)
    recorded = []

    async def fake_archive(_session, *, tenant, actor_user_id):
        assert actor_user_id == super_user.id
        return TenantArchiveResult(archived_at, True, 3)

    async def fake_activity(_session, **kwargs):
        recorded.append(kwargs)

    monkeypatch.setattr(super_admin, "archive_tenant_data", fake_archive)
    monkeypatch.setattr(super_admin, "record_super_activity", fake_activity)

    response = await super_admin.archive_tenant(tenant.id, super_user, session)

    assert response["status"] == "archived"
    assert session.commits == 1
    assert len(recorded) == 1
    assert recorded[0]["event_type"] == "school.archived"
    assert recorded[0]["tenant_id"] == tenant.id
    assert recorded[0]["meta"]["data_preserved"] is True


@pytest.mark.asyncio
async def test_super_admin_repeated_archive_does_not_duplicate_audit(monkeypatch):
    archived_at = datetime(2026, 7, 14, 12, 0, 0)
    tenant = Tenant(id=uuid.uuid4(), name="School", deleted_at=archived_at)
    super_user = User(id=uuid.uuid4(), username="root", is_super_admin=True)
    session = FakeSession(tenant)

    async def fake_archive(_session, **_kwargs):
        return TenantArchiveResult(archived_at, False)

    async def unexpected_activity(*_args, **_kwargs):
        raise AssertionError("Repeated archive must not duplicate audit events")

    monkeypatch.setattr(super_admin, "archive_tenant_data", fake_archive)
    monkeypatch.setattr(super_admin, "record_super_activity", unexpected_activity)

    response = await super_admin.archive_tenant(tenant.id, super_user, session)

    assert response["status"] == "already_archived"
    assert session.commits == 0
