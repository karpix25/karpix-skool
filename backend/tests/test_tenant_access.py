import uuid

import pytest
from fastapi import HTTPException
from starlette.requests import Request

from app.models import MemberRole, Tenant, TenantMember, User, UserAdminStatus
from app.services.tenant_access import ensure_tenant_access
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

    async def exec(self, _statement):
        self.exec_count += 1
        if not self._exec_results:
            raise AssertionError("Unexpected database query")
        return self._exec_results.pop(0)

    async def get(self, model, item_id):
        self.get_calls.append((model, item_id))
        return self._objects.get((model, item_id))


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
async def test_ensure_tenant_access_allows_moderator_membership():
    tenant_id = uuid.uuid4()
    manager = User(id=uuid.uuid4(), username="manager")
    manager_membership = TenantMember(
        tenant_id=tenant_id,
        user_id=manager.id,
        role=MemberRole.moderator,
    )
    session = FakeSession(
        exec_results=[FakeResult(first_value=manager_membership)]
    )

    membership = await ensure_tenant_access(
        tenant_id=tenant_id,
        user=manager,
        session=session,
    )

    assert membership == manager_membership
    assert session.exec_count == 1
    assert session.get_calls == []


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
    session = FakeSession(exec_results=[FakeResult(first_value=manager_membership)])
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
