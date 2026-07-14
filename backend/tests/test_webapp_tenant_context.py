import uuid

import pytest

from app.models import MemberRole, MemberStatus, Tenant, TenantMember, User
from app.routes.webapp import get_my_profile


class FakeResult:
    def __init__(self, *, first_value=None, all_value=None):
        self.first_value = first_value
        self.all_value = all_value if all_value is not None else []

    def first(self):
        return self.first_value

    def all(self):
        return self.all_value


class FakeSession:
    def __init__(self, *, tenant, results):
        self.tenant = tenant
        self.results = list(results)
        self.added = []

    async def get(self, model, item_id):
        if model is Tenant and item_id == self.tenant.id:
            return self.tenant
        return None

    async def exec(self, _statement):
        if not self.results:
            raise AssertionError("Unexpected database query")
        return self.results.pop(0)

    def add(self, item):
        self.added.append(item)

    async def commit(self):
        return None

    async def refresh(self, _item):
        return None


class FakeBackgroundTasks:
    def add_task(self, *_args, **_kwargs):
        raise AssertionError("No owner background sync expected")


def make_membership(user: User, tenant: Tenant) -> TenantMember:
    membership = TenantMember(
        tenant_id=tenant.id,
        user_id=user.id,
        role=MemberRole.student,
        status=MemberStatus.active,
    )
    membership.tenant = tenant
    return membership


@pytest.mark.asyncio
async def test_profile_does_not_disclose_requested_cross_tenant_data(monkeypatch):
    current_user = User(id=uuid.uuid4(), telegram_id=123, username="student")
    own_tenant = Tenant(id=uuid.uuid4(), name="Own School")
    foreign_tenant = Tenant(
        id=uuid.uuid4(),
        name="Foreign School",
        telegram_group_id=-100999,
        free_group_link="https://t.me/private_foreign_school",
    )
    own_membership = make_membership(current_user, own_tenant)
    session = FakeSession(
        tenant=foreign_tenant,
        results=[
            FakeResult(first_value=None),
            FakeResult(first_value=None),
            FakeResult(all_value=[own_membership]),
        ],
    )

    async def keep_existing_membership(**kwargs):
        return kwargs["membership"]

    monkeypatch.setattr(
        "app.routes.webapp.sync_membership_from_telegram_groups",
        keep_existing_membership,
    )

    response = await get_my_profile(
        background_tasks=FakeBackgroundTasks(),
        current_user=current_user,
        session=session,
        tenant_id=foreign_tenant.id,
    )

    assert response["membership"] is None
    assert response["tenant"] is None
    assert response["requested_tenant"] is None
    assert response["tenant_id"] is None
    assert response["access_status"] == "group_required"
    assert response["memberships"][0]["tenant_id"] == str(own_tenant.id)


@pytest.mark.asyncio
async def test_profile_preserves_superadmin_explicit_tenant_selection(monkeypatch):
    superadmin = User(
        id=uuid.uuid4(),
        telegram_id=123,
        username="root",
        is_super_admin=True,
    )
    tenant = Tenant(id=uuid.uuid4(), name="Selected School")
    session = FakeSession(
        tenant=tenant,
        results=[
            FakeResult(first_value=None),
            FakeResult(first_value=None),
            FakeResult(all_value=[]),
        ],
    )

    async def keep_existing_membership(**kwargs):
        return kwargs["membership"]

    monkeypatch.setattr(
        "app.routes.webapp.sync_membership_from_telegram_groups",
        keep_existing_membership,
    )

    response = await get_my_profile(
        background_tasks=FakeBackgroundTasks(),
        current_user=superadmin,
        session=session,
        tenant_id=tenant.id,
    )

    assert response["membership"] is None
    assert response["requested_tenant"]["id"] == str(tenant.id)
    assert response["tenant_id"] == str(tenant.id)
