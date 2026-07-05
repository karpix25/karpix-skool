import uuid

import pytest
from fastapi import HTTPException

from app.models import (
    Course,
    CourseSubscription,
    CourseUnlockType,
    MemberStatus,
    Tenant,
    TenantMember,
    User,
)
from app.services.webapp.course_subscriptions import subscribe_to_course, unsubscribe_from_course


class FakeResult:
    def __init__(self, *, first_value=None):
        self._first_value = first_value

    def first(self):
        return self._first_value


class FakeSession:
    def __init__(self, objects=None, exec_results=None):
        self._objects = {(type(item), item.id): item for item in objects or []}
        self._exec_results = list(exec_results or [])
        self.added = []
        self.committed = False
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
        self.committed = True

    async def refresh(self, item):
        self.refreshed.append(item)


def subscription_context():
    tenant = Tenant(id=uuid.uuid4(), name="School")
    user = User(id=uuid.uuid4(), telegram_id=123, username="student")
    member = TenantMember(
        tenant_id=tenant.id,
        user_id=user.id,
        status=MemberStatus.active,
        level=1,
    )
    course = Course(
        id=uuid.uuid4(),
        tenant_id=tenant.id,
        title="Course",
        is_published=True,
        unlock_type=CourseUnlockType.open,
    )
    return tenant, user, member, course


@pytest.mark.asyncio
async def test_subscribe_to_course_creates_active_subscription():
    tenant, user, member, course = subscription_context()
    session = FakeSession(
        [tenant, user, member, course],
        [
            FakeResult(first_value=member),
            FakeResult(first_value=None),
            FakeResult(first_value=None),
        ],
    )

    subscription = await subscribe_to_course(
        session=session,
        current_user=user,
        course_id=course.id,
    )

    assert subscription.is_active is True
    assert subscription.course_id == course.id
    assert subscription.tenant_id == tenant.id
    assert subscription.user_id == user.id
    assert session.committed is True
    assert subscription in session.refreshed


@pytest.mark.asyncio
async def test_unsubscribe_to_course_is_idempotent_for_existing_subscription():
    tenant, user, member, course = subscription_context()
    subscription = CourseSubscription(
        tenant_id=tenant.id,
        course_id=course.id,
        user_id=user.id,
        is_active=True,
    )
    session = FakeSession(
        [tenant, user, member, course, subscription],
        [
            FakeResult(first_value=member),
            FakeResult(first_value=None),
            FakeResult(first_value=subscription),
        ],
    )

    next_subscription = await unsubscribe_from_course(
        session=session,
        current_user=user,
        course_id=course.id,
    )

    assert next_subscription is subscription
    assert subscription.is_active is False
    assert session.committed is True


@pytest.mark.asyncio
async def test_subscribe_to_course_rejects_missing_membership():
    tenant, user, _member, course = subscription_context()
    session = FakeSession(
        [tenant, user, course],
        [FakeResult(first_value=None)],
    )

    with pytest.raises(HTTPException) as exc_info:
        await subscribe_to_course(
            session=session,
            current_user=user,
            course_id=course.id,
        )

    assert exc_info.value.status_code == 403
    assert session.added == []
    assert session.committed is False
