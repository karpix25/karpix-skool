import uuid

import pytest

from app.models import MemberRole, Tenant, TenantMember, User, UserAdminStatus
from app.routes.tenants import TenantCreate, create_tenant


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
