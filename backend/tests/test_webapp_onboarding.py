import uuid

import pytest
from fastapi import HTTPException

from app.models import MemberStatus, TenantMember, User
from app.routes.webapp import complete_onboarding


class FakeResult:
    def __init__(self, rows):
        self._rows = rows

    def all(self):
        return self._rows


class FakeSession:
    def __init__(self, memberships):
        self.memberships = list(memberships)
        self.added = []
        self.committed = False
        self.exec_count = 0

    async def exec(self, statement):
        self.exec_count += 1
        params = statement.compile().params
        requested_values = {str(value) for value in params.values()}
        rows = [
            membership
            for membership in self.memberships
            if str(membership.tenant_id) in requested_values
            and str(membership.user_id) in requested_values
        ]
        return FakeResult(rows)

    def add(self, obj):
        self.added.append(obj)

    async def commit(self):
        self.committed = True


def student_user():
    return User(id=uuid.uuid4(), telegram_id=123, username="student")


def active_membership(user_id, tenant_id):
    return TenantMember(
        tenant_id=tenant_id,
        user_id=user_id,
        status=MemberStatus.active,
        is_onboarded=False,
    )


@pytest.mark.asyncio
async def test_complete_onboarding_marks_only_requested_student_membership():
    user = student_user()
    tenant_a_id = uuid.uuid4()
    tenant_b_id = uuid.uuid4()
    membership_a = active_membership(user.id, tenant_a_id)
    membership_b = active_membership(user.id, tenant_b_id)
    session = FakeSession([membership_a, membership_b])

    response = await complete_onboarding(
        tenant_id=tenant_a_id,
        current_user=user,
        session=session,
    )

    assert response == {"status": "success"}
    assert membership_a.is_onboarded is True
    assert membership_b.is_onboarded is False
    assert session.added == [membership_a]
    assert session.committed is True


@pytest.mark.asyncio
async def test_complete_onboarding_requires_tenant_id_for_student():
    user = student_user()
    session = FakeSession([active_membership(user.id, uuid.uuid4())])

    with pytest.raises(HTTPException) as exc:
        await complete_onboarding(
            tenant_id=None,
            current_user=user,
            session=session,
        )

    assert exc.value.status_code == 400
    assert exc.value.detail == "tenant_id is required"
    assert session.exec_count == 0
    assert session.committed is False
