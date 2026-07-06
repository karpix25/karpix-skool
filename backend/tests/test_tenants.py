import uuid
from types import SimpleNamespace

import pytest
from fastapi import HTTPException

from app.models import MemberRole, Tenant, TenantMember, User, UserAdminStatus
from app.routes import tenants as tenants_route
from app.routes.tenants import TenantCreate, build_tenant_read, create_tenant, update_tenant


class FakeCountResult:
    def one(self):
        return 0


class FakeSession:
    def __init__(self):
        self.added = []
        self.committed = False
        self.refreshed = []

    async def exec(self, _statement):
        return FakeCountResult()

    def add(self, item):
        self.added.append(item)

    async def commit(self):
        self.committed = True

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

    def add(self, item):
        self.added.append(item)

    async def commit(self):
        self.committed = True

    async def refresh(self, item):
        self.refreshed.append(item)


@pytest.mark.asyncio
async def test_create_tenant_creates_owner_membership_for_author():
    user = User(
        id=uuid.uuid4(),
        telegram_id=123,
        username="author",
        admin_status=UserAdminStatus.approved,
    )
    session = FakeSession()

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
    assert session.committed is True


def test_tenant_read_masks_setup_code():
    tenant = Tenant(
        id=uuid.uuid4(),
        name="School",
        setup_code="START-super-secret-token",
    )

    response = build_tenant_read(tenant)

    assert response.setup_code != tenant.setup_code
    assert response.setup_code == "START-...oken"
    assert response.setup_code_masked is True


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
async def test_update_tenant_normalizes_vip_group_link(monkeypatch):
    user = User(id=uuid.uuid4(), telegram_id=123)
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
async def test_update_tenant_normalizes_free_group_link(monkeypatch):
    user = User(id=uuid.uuid4(), telegram_id=123)
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
async def test_update_tenant_rejects_unsafe_vip_group_link(monkeypatch):
    user = User(id=uuid.uuid4(), telegram_id=123)
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
