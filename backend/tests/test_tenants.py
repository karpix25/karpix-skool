from datetime import datetime
import uuid
from types import SimpleNamespace

import pytest
from fastapi import HTTPException

from app.models import MemberRole, Tenant, TenantMember, TenantSetupScope, User, UserAdminStatus
from app.routes import tenants as tenants_route
from app.routes.tenants import (
    TenantCreate,
    build_tenant_read,
    create_tenant,
    disconnect_tenant_telegram_group,
    update_tenant,
)
from app.routes.webapp import build_webapp_tenant_payload
from app.services.tenant_group_bindings import TenantTelegramGroupScope


class FakeCountResult:
    def __init__(self, value=0):
        self.value = value

    def one(self):
        return self.value


class FakeSession:
    def __init__(self, *, owned_school_count=0):
        self.added = []
        self.committed = False
        self.refreshed = []
        self.owned_school_count = owned_school_count
        self.statements = []

    async def exec(self, statement):
        self.statements.append(statement)
        return FakeCountResult(self.owned_school_count)

    def add(self, item):
        self.added.append(item)

    async def flush(self):
        return None

    async def commit(self):
        self.committed = True

    async def flush(self):
        return None

    async def refresh(self, item):
        self.refreshed.append(item)


class FakeTenantResult:
    def __init__(self, tenant):
        self.tenant = tenant

    def first(self):
        return self.tenant


class FakeTenantUpdateSession:
    def __init__(self, tenant: Tenant):
        self.tenant = tenant
        self.added = []
        self.committed = False
        self.refreshed = []

    async def exec(self, _statement):
        return FakeTenantResult(self.tenant)

    async def get(self, _model, item_id):
        return self.tenant if item_id == self.tenant.id else None

    def add(self, item):
        self.added.append(item)

    async def commit(self):
        self.committed = True

    async def refresh(self, item):
        self.refreshed.append(item)


def make_super_admin_user() -> User:
    return User(id=uuid.uuid4(), telegram_id=123, is_super_admin=True)


@pytest.mark.asyncio
async def test_create_tenant_creates_owner_membership_for_author(monkeypatch):
    user = User(
        id=uuid.uuid4(),
        telegram_id=123,
        username="author",
        admin_status=UserAdminStatus.none,
    )
    session = FakeSession()

    async def fake_create_trial_subscription(_session, tenant_id):
        return SimpleNamespace(tenant_id=tenant_id, trial_ends_at=datetime(2026, 8, 1))

    monkeypatch.setattr(
        tenants_route,
        "create_trial_subscription",
        fake_create_trial_subscription,
    )

    response = await create_tenant(
        TenantCreate(name="Author School"),
        current_user=user,
        session=session,
    )

    tenant = next(item for item in session.added if isinstance(item, Tenant))
    membership = next(item for item in session.added if isinstance(item, TenantMember))

    assert response.id == tenant.id
    assert membership.tenant_id == tenant.id
    assert membership.user_id == user.id
    assert membership.role == MemberRole.owner
    assert membership.is_onboarded is True
    assert tenant.setup_code is None
    assert session.committed is True
    assert session.statements[0]._for_update_arg is not None


@pytest.mark.asyncio
async def test_create_tenant_rejects_second_school_with_stable_conflict(monkeypatch):
    user = User(id=uuid.uuid4(), telegram_id=123, admin_status=UserAdminStatus.none)
    session = FakeSession(owned_school_count=1)

    with pytest.raises(HTTPException) as exc_info:
        await create_tenant(
            TenantCreate(name="Second School"),
            current_user=user,
            session=session,
        )

    assert exc_info.value.status_code == 409
    assert exc_info.value.detail == "School creation limit reached."
    assert session.committed is False
    assert session.added == []


def test_tenant_read_does_not_expose_legacy_setup_code():
    tenant = Tenant(
        id=uuid.uuid4(),
        name="School",
        setup_code="START-super-secret-token",
    )

    response = build_tenant_read(tenant)

    assert response.setup_code is None
    assert response.setup_code_masked is False


def test_tenant_read_includes_welcome_video_fields():
    tenant = Tenant(
        id=uuid.uuid4(),
        name="School",
        welcome_video_enabled=True,
        welcome_video_url=" HTTPS://Example.com/welcome ",
        welcome_video_title="Start here",
        welcome_video_description="Watch this before the first lesson.",
    )

    response = build_tenant_read(tenant)

    assert response.welcome_video_enabled is True
    assert response.welcome_video_url == "https://example.com/welcome"
    assert response.welcome_video_title == "Start here"
    assert response.welcome_video_description == "Watch this before the first lesson."


def test_webapp_tenant_payload_includes_welcome_video_fields():
    tenant = Tenant(
        id=uuid.uuid4(),
        name="School",
        welcome_video_enabled=True,
        welcome_video_url="https://cdn.example.com/intro.mp4",
        welcome_video_title="Welcome",
        welcome_video_description="A quick hello from the author.",
    )

    payload = build_webapp_tenant_payload(tenant)

    assert payload["welcome_video_enabled"] is True
    assert payload["welcome_video_url"] == "https://cdn.example.com/intro.mp4"
    assert payload["welcome_video_title"] == "Welcome"
    assert payload["welcome_video_description"] == "A quick hello from the author."


def test_tenant_read_does_not_return_unsafe_vip_group_link():
    tenant = Tenant(
        id=uuid.uuid4(),
        name="School",
        vip_group_link="javascript:alert(1)",
    )

    response = build_tenant_read(tenant)

    assert response.vip_group_link is None


def test_tenant_read_does_not_return_unsafe_free_group_link():
    tenant = Tenant(
        id=uuid.uuid4(),
        name="School",
        free_group_link="javascript:alert(1)",
    )

    response = build_tenant_read(tenant)

    assert response.free_group_link is None


@pytest.mark.asyncio
async def test_create_tenant_rejects_unsafe_welcome_video_url():
    user = User(
        id=uuid.uuid4(),
        telegram_id=123,
        username="author",
        admin_status=UserAdminStatus.approved,
    )
    session = FakeSession()

    with pytest.raises(HTTPException) as exc_info:
        await create_tenant(
            TenantCreate(name="Author School", welcome_video_url="javascript:alert(1)"),
            current_user=user,
            session=session,
        )

    assert exc_info.value.status_code == 422
    assert session.added == []
    assert session.committed is False


@pytest.mark.asyncio
async def test_update_tenant_normalizes_vip_group_link(monkeypatch):
    user = make_super_admin_user()
    tenant = Tenant(id=uuid.uuid4(), name="School", owner_user_id=user.id)
    session = FakeTenantUpdateSession(tenant)

    async def fake_get_tenant_stat(_session, _tenant_id):
        return SimpleNamespace(member_count=0, course_count=0)

    monkeypatch.setattr(tenants_route, "get_tenant_stat", fake_get_tenant_stat)

    response = await update_tenant(
        tenant.id,
        TenantCreate(vip_group_link=" HTTPS://T.ME/myvip "),
        current_user=user,
        session=session,
    )

    assert tenant.vip_group_link == "https://t.me/myvip"
    assert response.vip_group_link == "https://t.me/myvip"
    assert session.committed is True


@pytest.mark.asyncio
async def test_owner_can_update_own_tenant_settings(monkeypatch):
    owner = User(id=uuid.uuid4(), username="owner")
    tenant = Tenant(id=uuid.uuid4(), name="School", owner_user_id=owner.id)
    session = FakeTenantUpdateSession(tenant)

    async def fake_entitlement(_session, _tenant):
        return None

    async def fake_get_tenant_stat(_session, _tenant_id):
        return SimpleNamespace(member_count=0, course_count=0)

    monkeypatch.setattr(
        "app.services.team_management.ensure_tenant_write_entitlement",
        fake_entitlement,
    )
    monkeypatch.setattr(tenants_route, "get_tenant_stat", fake_get_tenant_stat)

    response = await update_tenant(
        tenant.id,
        TenantCreate(name="Renamed School"),
        current_user=owner,
        session=session,
    )

    assert response.name == "Renamed School"
    assert tenant.name == "Renamed School"
    assert session.committed is True


@pytest.mark.asyncio
async def test_admin_cannot_update_foreign_or_owned_tenant_settings():
    admin = User(id=uuid.uuid4(), username="admin")
    tenant = Tenant(id=uuid.uuid4(), name="School", owner_user_id=uuid.uuid4())
    session = FakeTenantUpdateSession(tenant)

    with pytest.raises(HTTPException) as exc_info:
        await update_tenant(
            tenant.id,
            TenantCreate(name="Forbidden Rename"),
            current_user=admin,
            session=session,
        )

    assert exc_info.value.status_code == 403
    assert tenant.name == "School"
    assert session.committed is False


@pytest.mark.asyncio
async def test_update_tenant_normalizes_free_group_link(monkeypatch):
    user = make_super_admin_user()
    tenant = Tenant(id=uuid.uuid4(), name="School", owner_user_id=user.id)
    session = FakeTenantUpdateSession(tenant)

    async def fake_get_tenant_stat(_session, _tenant_id):
        return SimpleNamespace(member_count=0, course_count=0)

    monkeypatch.setattr(tenants_route, "get_tenant_stat", fake_get_tenant_stat)

    response = await update_tenant(
        tenant.id,
        TenantCreate(free_group_link="@aikarlo"),
        current_user=user,
        session=session,
    )

    assert tenant.free_group_link == "https://t.me/aikarlo"
    assert response.free_group_link == "https://t.me/aikarlo"
    assert session.committed is True


@pytest.mark.asyncio
async def test_update_tenant_updates_welcome_video_fields(monkeypatch):
    user = make_super_admin_user()
    tenant = Tenant(
        id=uuid.uuid4(),
        name="School",
        owner_user_id=user.id,
        welcome_video_enabled=False,
    )
    session = FakeTenantUpdateSession(tenant)

    async def fake_get_tenant_stat(_session, _tenant_id):
        return SimpleNamespace(member_count=0, course_count=0)

    monkeypatch.setattr(tenants_route, "get_tenant_stat", fake_get_tenant_stat)

    response = await update_tenant(
        tenant.id,
        TenantCreate(
            welcome_video_enabled=True,
            welcome_video_url=" HTTPS://Video.Example.com/Intro?id=1 ",
            welcome_video_title="Welcome in",
            welcome_video_description="Start with this short orientation.",
        ),
        current_user=user,
        session=session,
    )

    assert tenant.welcome_video_enabled is True
    assert tenant.welcome_video_url == "https://video.example.com/Intro?id=1"
    assert tenant.welcome_video_title == "Welcome in"
    assert tenant.welcome_video_description == "Start with this short orientation."
    assert response.welcome_video_url == "https://video.example.com/Intro?id=1"
    assert session.committed is True


@pytest.mark.asyncio
async def test_update_tenant_clears_welcome_video_url(monkeypatch):
    user = make_super_admin_user()
    tenant = Tenant(
        id=uuid.uuid4(),
        name="School",
        owner_user_id=user.id,
        welcome_video_enabled=True,
        welcome_video_url="https://video.example.com/intro",
    )
    session = FakeTenantUpdateSession(tenant)

    async def fake_get_tenant_stat(_session, _tenant_id):
        return SimpleNamespace(member_count=0, course_count=0)

    monkeypatch.setattr(tenants_route, "get_tenant_stat", fake_get_tenant_stat)

    response = await update_tenant(
        tenant.id,
        TenantCreate(welcome_video_url=None),
        current_user=user,
        session=session,
    )

    assert tenant.welcome_video_url is None
    assert response.welcome_video_url is None
    assert session.committed is True


@pytest.mark.asyncio
async def test_update_tenant_rejects_unsafe_welcome_video_url(monkeypatch):
    user = make_super_admin_user()
    tenant = Tenant(
        id=uuid.uuid4(),
        name="School",
        owner_user_id=user.id,
        welcome_video_url="https://video.example.com/safe",
    )
    session = FakeTenantUpdateSession(tenant)

    async def fake_get_tenant_stat(_session, _tenant_id):
        return SimpleNamespace(member_count=0, course_count=0)

    monkeypatch.setattr(tenants_route, "get_tenant_stat", fake_get_tenant_stat)

    with pytest.raises(HTTPException) as exc_info:
        await update_tenant(
            tenant.id,
            TenantCreate(welcome_video_url="data:text/html,<script>alert(1)</script>"),
            current_user=user,
            session=session,
        )

    assert exc_info.value.status_code == 422
    assert tenant.welcome_video_url == "https://video.example.com/safe"
    assert session.committed is False


@pytest.mark.asyncio
async def test_update_tenant_rejects_unsafe_vip_group_link(monkeypatch):
    user = make_super_admin_user()
    tenant = Tenant(
        id=uuid.uuid4(),
        name="School",
        owner_user_id=user.id,
        vip_group_link="https://t.me/safe",
    )
    session = FakeTenantUpdateSession(tenant)

    async def fake_get_tenant_stat(_session, _tenant_id):
        return SimpleNamespace(member_count=0, course_count=0)

    monkeypatch.setattr(tenants_route, "get_tenant_stat", fake_get_tenant_stat)

    with pytest.raises(HTTPException) as exc_info:
        await update_tenant(
            tenant.id,
            TenantCreate(vip_group_link="javascript:alert(1)"),
            current_user=user,
            session=session,
        )

    assert exc_info.value.status_code == 422
    assert tenant.vip_group_link == "https://t.me/safe"
    assert session.committed is False


@pytest.mark.asyncio
async def test_disconnect_tenant_telegram_group_clears_regular_binding(monkeypatch):
    user = make_super_admin_user()
    tenant = Tenant(
        id=uuid.uuid4(),
        name="School",
        owner_user_id=user.id,
        telegram_group_id=-100123,
        telegram_topic_id=456,
        free_group_link="https://t.me/aikarlo",
        last_sync_at=datetime(2026, 1, 1),
    )
    session = FakeTenantUpdateSession(tenant)
    revoked = []

    async def fake_ensure_tenant_access(_tenant_id, _user, _session, tenant=None):
        return None

    async def fake_revoke_active_setup_tokens(_session, *, tenant_id, scope, now=None):
        revoked.append((tenant_id, scope))

    async def fake_get_tenant_stat(_session, _tenant_id):
        return SimpleNamespace(member_count=3, course_count=2)

    monkeypatch.setattr(tenants_route, "ensure_tenant_access", fake_ensure_tenant_access)
    monkeypatch.setattr(tenants_route, "revoke_active_setup_tokens", fake_revoke_active_setup_tokens)
    monkeypatch.setattr(tenants_route, "get_tenant_stat", fake_get_tenant_stat)

    response = await disconnect_tenant_telegram_group(
        tenant.id,
        TenantTelegramGroupScope.regular,
        current_user=user,
        session=session,
    )

    assert tenant.telegram_group_id is None
    assert tenant.telegram_topic_id is None
    assert tenant.free_group_link is None
    assert tenant.last_sync_at is None
    assert response.telegram_group_id is None
    assert response.free_group_link is None
    assert response.member_count == 3
    assert response.course_count == 2
    assert revoked == [(tenant.id, TenantSetupScope.free_group_link)]
    assert session.committed is True


@pytest.mark.asyncio
async def test_disconnect_tenant_telegram_group_clears_vip_binding(monkeypatch):
    user = make_super_admin_user()
    tenant = Tenant(
        id=uuid.uuid4(),
        name="School",
        owner_user_id=user.id,
        telegram_group_id_vip=-100999,
        telegram_topic_id_vip=777,
        vip_group_link="https://t.me/vip",
        last_sync_at=datetime(2026, 1, 1),
    )
    session = FakeTenantUpdateSession(tenant)
    revoked = []

    async def fake_ensure_tenant_access(_tenant_id, _user, _session, tenant=None):
        return None

    async def fake_revoke_active_setup_tokens(_session, *, tenant_id, scope, now=None):
        revoked.append((tenant_id, scope))

    async def fake_get_tenant_stat(_session, _tenant_id):
        return SimpleNamespace(member_count=0, course_count=0)

    monkeypatch.setattr(tenants_route, "ensure_tenant_access", fake_ensure_tenant_access)
    monkeypatch.setattr(tenants_route, "revoke_active_setup_tokens", fake_revoke_active_setup_tokens)
    monkeypatch.setattr(tenants_route, "get_tenant_stat", fake_get_tenant_stat)

    response = await disconnect_tenant_telegram_group(
        tenant.id,
        TenantTelegramGroupScope.vip,
        current_user=user,
        session=session,
    )

    assert tenant.telegram_group_id_vip is None
    assert tenant.telegram_topic_id_vip is None
    assert tenant.vip_group_link is None
    assert tenant.last_sync_at is None
    assert response.telegram_group_id_vip is None
    assert response.vip_group_link is None
    assert revoked == [(tenant.id, TenantSetupScope.vip_group_link)]
    assert session.committed is True
