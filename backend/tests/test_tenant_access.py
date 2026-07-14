import uuid
from datetime import datetime

import pytest
from fastapi import HTTPException
from starlette.requests import Request

from app.models import MemberRole, Tenant, TenantMember, User, UserAdminStatus
from app.services import tenant_access as tenant_access_service
from app.services.tenant_access import ensure_tenant_access, transfer_tenant_ownership
from app.utils.tenant import get_active_tenant_id


def make_request(headers=None, query_string: str = "") -> Request:
    return Request(
        {
            "type": "http",
            "method": "GET",
            "path": "/courses",
            "headers": headers or [],
            "query_string": query_string.encode(),
        }
    )


class FakeResult:
    def __init__(self, *, first_value=None, all_value=None):
        self._first_value = first_value
        self._all_value = all_value if all_value is not None else []

    def first(self):
        return self._first_value

    def all(self):
        return self._all_value


class FakeSession:
    def __init__(self, *, exec_results=None, objects=None):
        self._exec_results = list(exec_results or [])
        self._objects = {(type(item), item.id): item for item in objects or []}
        self.exec_count = 0
        self.get_calls = []
        self.added = []

    async def exec(self, _statement):
        self.exec_count += 1
        if not self._exec_results:
            raise AssertionError("Unexpected database query")
        return self._exec_results.pop(0)

    async def get(self, model, item_id):
        self.get_calls.append((model, item_id))
        return self._objects.get((model, item_id))

    def add(self, item):
        self.added.append(item)


@pytest.mark.asyncio
async def test_ensure_tenant_access_allows_super_admin_without_queries():
    tenant_id = uuid.uuid4()
    super_admin = User(id=uuid.uuid4(), username="root", is_super_admin=True)
    session = FakeSession()

    membership = await ensure_tenant_access(tenant_id, super_admin, session)

    assert membership is None
    assert session.exec_count == 0
    assert session.get_calls == []


@pytest.mark.asyncio
async def test_ensure_tenant_access_rejects_legacy_moderator_membership():
    tenant_id = uuid.uuid4()
    manager = User(id=uuid.uuid4(), username="manager")
    manager_membership = TenantMember(
        tenant_id=tenant_id,
        user_id=manager.id,
        role=MemberRole.moderator,
    )
    tenant = Tenant(id=tenant_id, name="School", owner_user_id=uuid.uuid4())
    session = FakeSession(
        exec_results=[FakeResult(first_value=None)],
        objects=[tenant, manager_membership],
    )

    with pytest.raises(HTTPException) as exc_info:
        await ensure_tenant_access(
            tenant_id=tenant_id,
            user=manager,
            session=session,
        )

    assert exc_info.value.status_code == 403
    assert session.exec_count == 1
    assert session.get_calls == [(Tenant, tenant_id)]


@pytest.mark.asyncio
async def test_ensure_tenant_access_keeps_owner_user_id_fallback():
    tenant_id = uuid.uuid4()
    owner = User(id=uuid.uuid4(), username="owner")
    tenant = Tenant(id=tenant_id, name="School", owner_user_id=owner.id)
    session = FakeSession(
        exec_results=[FakeResult(first_value=None)],
        objects=[tenant],
    )

    membership = await ensure_tenant_access(tenant_id, owner, session)

    assert membership is None
    assert session.exec_count == 1
    assert session.get_calls == [(Tenant, tenant_id)]


@pytest.mark.asyncio
async def test_ensure_tenant_access_rejects_user_without_management_access():
    tenant_id = uuid.uuid4()
    user = User(id=uuid.uuid4(), username="student")
    tenant = Tenant(id=tenant_id, name="School", owner_user_id=uuid.uuid4())
    session = FakeSession(
        exec_results=[FakeResult(first_value=None)],
        objects=[tenant],
    )

    with pytest.raises(HTTPException) as exc_info:
        await ensure_tenant_access(tenant_id, user, session)

    assert exc_info.value.status_code == 403


@pytest.mark.asyncio
async def test_ensure_tenant_access_hides_archived_school_before_membership_query():
    tenant_id = uuid.uuid4()
    user = User(id=uuid.uuid4(), username="manager")
    tenant = Tenant(
        id=tenant_id,
        name="Archived School",
        deleted_at=datetime.utcnow(),
    )
    session = FakeSession(objects=[tenant])

    with pytest.raises(HTTPException) as exc_info:
        await ensure_tenant_access(tenant_id, user, session)

    assert exc_info.value.status_code == 404
    assert session.exec_count == 0


@pytest.mark.asyncio
async def test_ensure_tenant_access_checks_entitlement_only_for_write(monkeypatch):
    tenant_id = uuid.uuid4()
    manager = User(id=uuid.uuid4(), username="manager")
    tenant = Tenant(id=tenant_id, name="School", owner_user_id=uuid.uuid4())
    membership = TenantMember(
        tenant_id=tenant_id,
        user_id=manager.id,
        role=MemberRole.admin,
    )
    session = FakeSession(exec_results=[FakeResult(first_value=membership)])
    checked = []

    async def fake_ensure_write(_session, checked_tenant):
        checked.append(checked_tenant.id)

    monkeypatch.setattr(
        tenant_access_service,
        "ensure_tenant_write_entitlement",
        fake_ensure_write,
    )

    result = await ensure_tenant_access(
        tenant_id,
        manager,
        session,
        tenant=tenant,
        require_write=True,
    )

    assert result is membership
    assert checked == [tenant_id]


@pytest.mark.asyncio
async def test_active_tenant_allows_existing_manager_without_approved_admin_status():
    tenant_id = uuid.uuid4()
    manager = User(
        id=uuid.uuid4(),
        username="manager",
        admin_status=UserAdminStatus.none,
    )
    manager_membership = TenantMember(
        tenant_id=tenant_id,
        user_id=manager.id,
        role=MemberRole.admin,
    )
    tenant = Tenant(id=tenant_id, name="School")
    session = FakeSession(
        exec_results=[FakeResult(first_value=manager_membership)],
        objects=[tenant],
    )
    request = make_request(headers=[(b"x-tenant-id", str(tenant_id).encode())])

    active_tenant_id = await get_active_tenant_id(request, manager, session)

    assert active_tenant_id == tenant_id
    assert session.exec_count == 1


@pytest.mark.asyncio
async def test_active_tenant_rejects_super_admin_without_explicit_tenant():
    super_admin = User(id=uuid.uuid4(), username="root", is_super_admin=True)
    session = FakeSession()
    request = make_request()

    with pytest.raises(HTTPException) as exc_info:
        await get_active_tenant_id(request, super_admin, session)

    assert exc_info.value.status_code == 400
    assert "Tenant ID required" in exc_info.value.detail
    assert session.exec_count == 0
    assert session.get_calls == []


@pytest.mark.asyncio
async def test_active_tenant_uses_sole_managed_school_without_header():
    tenant_id = uuid.uuid4()
    manager = User(id=uuid.uuid4(), username="manager")
    session = FakeSession(exec_results=[FakeResult(all_value=[tenant_id])])

    active_tenant_id = await get_active_tenant_id(make_request(), manager, session)

    assert active_tenant_id == tenant_id
    assert session.exec_count == 1


@pytest.mark.asyncio
async def test_active_tenant_requires_context_for_multiple_managed_schools():
    manager = User(id=uuid.uuid4(), username="manager")
    tenant_ids = [uuid.uuid4(), uuid.uuid4()]
    session = FakeSession(exec_results=[FakeResult(all_value=tenant_ids)])

    with pytest.raises(HTTPException) as exc_info:
        await get_active_tenant_id(make_request(), manager, session)

    assert exc_info.value.status_code == 409
    assert "Tenant context is required" in exc_info.value.detail


@pytest.mark.asyncio
async def test_transfer_tenant_ownership_revokes_previous_owner_role_without_commit():
    tenant_id = uuid.uuid4()
    previous_owner = User(id=uuid.uuid4(), username="previous")
    new_owner = User(id=uuid.uuid4(), username="new")
    tenant = Tenant(id=tenant_id, name="School", owner_user_id=previous_owner.id)
    previous_membership = TenantMember(
        tenant_id=tenant_id,
        user_id=previous_owner.id,
        role=MemberRole.owner,
    )
    new_membership = TenantMember(
        tenant_id=tenant_id,
        user_id=new_owner.id,
        role=MemberRole.student,
        status="paused",
        deleted_at=datetime.utcnow(),
    )
    session = FakeSession(
        exec_results=[FakeResult(all_value=[previous_membership, new_membership])]
    )

    await transfer_tenant_ownership(
        tenant=tenant,
        new_owner=new_owner,
        session=session,
    )

    assert tenant.owner_user_id == new_owner.id
    assert previous_membership.role == MemberRole.student
    assert new_membership.role == MemberRole.owner
    assert new_membership.status == "active"
    assert new_membership.deleted_at is None
    assert new_membership.paused_at is None
    assert tenant in session.added
    assert previous_membership in session.added
    assert new_membership in session.added


@pytest.mark.asyncio
async def test_transfer_tenant_ownership_creates_owner_membership_for_new_user():
    previous_owner_id = uuid.uuid4()
    tenant = Tenant(id=uuid.uuid4(), name="School", owner_user_id=previous_owner_id)
    new_owner = User(id=uuid.uuid4(), username="new")
    session = FakeSession(exec_results=[FakeResult(all_value=[])])

    await transfer_tenant_ownership(
        tenant=tenant,
        new_owner=new_owner,
        session=session,
    )

    new_membership = next(
        item
        for item in session.added
        if isinstance(item, TenantMember) and item.user_id == new_owner.id
    )
    assert new_membership.tenant_id == tenant.id
    assert new_membership.role == MemberRole.owner
    assert new_membership.status == "active"
