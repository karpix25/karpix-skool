import uuid

import pytest
from fastapi import HTTPException
from starlette.requests import Request

from app.models import Course, Tenant, User
from app.services.webapp.course_access_context import (
    build_course_detail_access_context,
    build_course_list_access_context,
    get_requested_tenant_id,
)


class FakeSession:
    def __init__(self, tenants=None):
        self.tenants = tenants or {}
        self.get_calls = []
        self.exec_calls = 0

    async def get(self, model, item_id):
        self.get_calls.append((model, item_id))
        return self.tenants.get(item_id)

    async def exec(self, _statement):
        self.exec_calls += 1
        raise AssertionError("Unexpected query")


def make_request(tenant_id: str | None = None) -> Request:
    headers = []
    if tenant_id is not None:
        headers.append((b"x-tenant-id", tenant_id.encode()))

    return Request(
        {
            "type": "http",
            "method": "GET",
            "path": "/webapp/courses",
            "headers": headers,
            "query_string": b"",
        }
    )


def make_super_admin() -> User:
    return User(id=uuid.uuid4(), username="root", is_super_admin=True)


@pytest.mark.asyncio
async def test_super_admin_course_list_preview_uses_selected_tenant_without_membership():
    tenant_id = uuid.uuid4()
    tenant = Tenant(id=tenant_id, name="Selected school")
    session = FakeSession({tenant_id: tenant})

    context = await build_course_list_access_context(
        session=session,
        request=make_request(str(tenant_id)),
        current_user=make_super_admin(),
    )

    assert context.tenant_ids == [tenant_id]
    assert context.active_tenants == {tenant_id: tenant}
    assert context.membership_by_tenant == {}
    assert context.is_super_admin_preview is True
    assert session.exec_calls == 0


@pytest.mark.asyncio
async def test_super_admin_course_list_preview_requires_selected_tenant():
    session = FakeSession()

    context = await build_course_list_access_context(
        session=session,
        request=make_request(),
        current_user=make_super_admin(),
    )

    assert context.tenant_ids == []
    assert context.is_super_admin_preview is True
    assert session.get_calls == []
    assert session.exec_calls == 0


@pytest.mark.asyncio
async def test_super_admin_course_detail_preview_rejects_different_selected_tenant():
    tenant_id = uuid.uuid4()
    course = Course(id=uuid.uuid4(), tenant_id=tenant_id, title="Course", is_published=True)

    with pytest.raises(HTTPException) as exc_info:
        await build_course_detail_access_context(
            session=FakeSession(),
            request=make_request(str(uuid.uuid4())),
            current_user=make_super_admin(),
            course=course,
        )

    assert exc_info.value.status_code == 404


@pytest.mark.asyncio
async def test_super_admin_course_detail_preview_is_admin_read_context():
    tenant_id = uuid.uuid4()
    tenant = Tenant(id=tenant_id, name="Selected school")
    course = Course(id=uuid.uuid4(), tenant_id=tenant_id, title="Course", is_published=True)

    context = await build_course_detail_access_context(
        session=FakeSession({tenant_id: tenant}),
        request=make_request(str(tenant_id)),
        current_user=make_super_admin(),
        course=course,
    )

    assert context.tenant == tenant
    assert context.membership is None
    assert context.is_admin is True


def test_requested_tenant_id_rejects_invalid_header():
    with pytest.raises(HTTPException) as exc_info:
        get_requested_tenant_id(make_request("not-a-uuid"))

    assert exc_info.value.status_code == 400
