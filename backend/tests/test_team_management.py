import uuid

import pytest
from fastapi import HTTPException

from app.models import MemberRole, Tenant, TenantMember, User
from app.services.team_management import add_team_member, update_team_member_role


class FakeResult:
    def __init__(self, *, first_value=None):
        self._first_value = first_value

    def first(self):
        return self._first_value


class FakeSession:
    def __init__(self, *, objects=None, exec_results=None):
        self._objects = {(type(item), item.id): item for item in objects or []}
        self._exec_results = list(exec_results or [])
        self.added = []
        self.commits = 0
        self.refreshed = []

    async def get(self, model, item_id):
        return self._objects.get((model, item_id))

    async def exec(self, _statement):
        if not self._exec_results:
            raise AssertionError("Unexpected database query")
        return self._exec_results.pop(0)

    def add(self, item):
        self.added.append(item)

    async def commit(self):
        self.commits += 1

    async def refresh(self, item):
        self.refreshed.append(item)


@pytest.mark.asyncio
async def test_super_admin_can_promote_existing_user_to_school_admin():
    tenant_id = uuid.uuid4()
    super_admin = User(id=uuid.uuid4(), username="root", is_super_admin=True)
    owner = User(id=uuid.uuid4(), username="owner")
    user = User(id=uuid.uuid4(), username="manager", telegram_id=777)
    tenant = Tenant(id=tenant_id, name="School", owner_user_id=owner.id)
    member = TenantMember(tenant_id=tenant_id, user_id=user.id, role=MemberRole.student)
    session = FakeSession(
        objects=[tenant],
        exec_results=[
            FakeResult(first_value=user),
            FakeResult(first_value=member),
        ],
    )

    response = await add_team_member(
        tenant_id,
        "@manager",
        MemberRole.admin,
        super_admin,
        session,
    )

    assert response.role == MemberRole.admin
    assert member.role == MemberRole.admin
    assert session.commits == 1


@pytest.mark.asyncio
async def test_owner_cannot_promote_team_members():
    tenant_id = uuid.uuid4()
    owner = User(id=uuid.uuid4(), username="owner")
    tenant = Tenant(id=tenant_id, name="School", owner_user_id=owner.id)
    session = FakeSession(objects=[tenant])

    with pytest.raises(HTTPException) as exc_info:
        await add_team_member(tenant_id, "12345", MemberRole.admin, owner, session)

    assert exc_info.value.status_code == 403
    assert exc_info.value.detail == "Only super admin can manage school team and settings."


@pytest.mark.asyncio
async def test_regular_admin_cannot_promote_team_members():
    tenant_id = uuid.uuid4()
    user = User(id=uuid.uuid4(), username="admin")
    tenant = Tenant(id=tenant_id, name="School", owner_user_id=uuid.uuid4())
    session = FakeSession(objects=[tenant])

    with pytest.raises(HTTPException) as exc_info:
        await add_team_member(tenant_id, "12345", MemberRole.admin, user, session)

    assert exc_info.value.status_code == 403


@pytest.mark.asyncio
async def test_owner_cannot_assign_moderator_role():
    tenant_id = uuid.uuid4()
    owner = User(id=uuid.uuid4(), username="owner", is_super_admin=True)
    tenant = Tenant(id=tenant_id, name="School", owner_user_id=owner.id)
    session = FakeSession(objects=[tenant])

    with pytest.raises(HTTPException) as exc_info:
        await add_team_member(tenant_id, "12345", MemberRole.moderator, owner, session)

    assert exc_info.value.status_code == 400
    assert exc_info.value.detail == "Only admin can be assigned."


@pytest.mark.asyncio
async def test_owner_role_cannot_be_changed_from_team_screen():
    tenant_id = uuid.uuid4()
    super_admin = User(id=uuid.uuid4(), username="root", is_super_admin=True)
    owner = User(id=uuid.uuid4(), username="owner")
    tenant = Tenant(id=tenant_id, name="School", owner_user_id=owner.id)
    owner_member = TenantMember(
        id=uuid.uuid4(),
        tenant_id=tenant_id,
        user_id=owner.id,
        role=MemberRole.owner,
    )
    session = FakeSession(
        objects=[tenant],
        exec_results=[FakeResult(first_value=(owner_member, owner))],
    )

    with pytest.raises(HTTPException) as exc_info:
        await update_team_member_role(
            tenant_id,
            owner_member.id,
            MemberRole.admin,
            super_admin,
            session,
        )

    assert exc_info.value.status_code == 400
    assert owner_member.role == MemberRole.owner
