import uuid

import pytest
from fastapi import HTTPException

from app.models import MemberRole, Tenant, TenantMember, User
from app.services.tenant_access import ensure_tenant_access


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
