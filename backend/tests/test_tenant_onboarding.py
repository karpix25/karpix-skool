import uuid
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest

from app.models import Tenant
from app.services import tenant_onboarding
from app.services.tenant_onboarding import (
    _launch_stage,
    get_tenant_onboarding_readiness_facts,
    get_tenant_onboarding_status,
    has_ready_school_profile,
)


class FakeResult:
    def __init__(self, *, one_value=None, first_value=None, all_values=None):
        self.one_value = one_value
        self.first_value = first_value
        self.all_values = all_values or []

    def one(self):
        return self.one_value

    def first(self):
        return self.first_value

    def all(self):
        return self.all_values


class FakeSession:
    def __init__(self, results):
        self.results = list(results)

    async def exec(self, _statement):
        return self.results.pop(0)


@pytest.mark.asyncio
async def test_tenant_onboarding_status_uses_server_counts():
    published_course_id = uuid.uuid4()
    session = FakeSession(
        [
            FakeResult(one_value=2),
            FakeResult(first_value=published_course_id),
            FakeResult(one_value=7),
            FakeResult(all_values=["school.student_preview_confirmed"]),
        ]
    )

    status = await get_tenant_onboarding_status(session, uuid.uuid4())

    assert status.courses_count == 2
    assert status.published_course_id == published_course_id
    assert status.students_count == 7
    assert status.has_student_preview is True
    assert status.is_completed is False


@pytest.mark.parametrize(
    ("inputs", "expected"),
    [
        ({"has_owner": False, "has_group": False, "courses_count": 0, "has_published_lesson": False, "students_count": 0, "has_student_preview": False}, "invited"),
        ({"has_owner": True, "has_group": False, "courses_count": 0, "has_published_lesson": False, "students_count": 0, "has_student_preview": False}, "owner_claimed"),
        ({"has_owner": True, "has_group": True, "courses_count": 0, "has_published_lesson": False, "students_count": 0, "has_student_preview": False}, "group_connected"),
        ({"has_owner": True, "has_group": True, "courses_count": 1, "has_published_lesson": False, "students_count": 0, "has_student_preview": False}, "course_created"),
        ({"has_owner": True, "has_group": True, "courses_count": 1, "has_published_lesson": True, "students_count": 1, "has_student_preview": False}, "lesson_published"),
        ({"has_owner": True, "has_group": True, "courses_count": 1, "has_published_lesson": True, "students_count": 1, "has_student_preview": True}, "launched"),
    ],
)
def test_launch_stage_progression(inputs, expected):
    assert _launch_stage(**inputs) == expected


@pytest.mark.asyncio
async def test_tenant_onboarding_status_keeps_empty_school_incomplete():
    session = FakeSession(
        [
            FakeResult(one_value=0),
            FakeResult(first_value=None),
            FakeResult(one_value=0),
            FakeResult(all_values=[]),
        ]
    )

    status = await get_tenant_onboarding_status(session, uuid.uuid4())

    assert status.courses_count == 0
    assert status.published_course_id is None
    assert status.students_count == 0
    assert status.has_student_preview is False
    assert status.is_completed is False


def test_school_profile_requires_meaningful_description_and_https_support():
    ready_tenant = Tenant(
        name="Школа",
        description="Практическая школа для дизайнеров",
        support_url="https://t.me/school_support",
    )
    assert has_ready_school_profile(ready_tenant) is True

    ready_tenant.description = "Слишком коротко"
    assert has_ready_school_profile(ready_tenant) is False
    ready_tenant.description = "Практическая школа для дизайнеров"
    ready_tenant.support_url = "http://example.com/support"
    assert has_ready_school_profile(ready_tenant) is False


@pytest.mark.asyncio
async def test_serving_subscription_is_derived_from_server_entitlement(monkeypatch):
    tenant = Tenant(
        name="Школа",
        description="Практическая школа для дизайнеров",
        support_url="https://t.me/school_support",
    )
    monkeypatch.setattr(
        tenant_onboarding,
        "get_tenant_subscription",
        AsyncMock(return_value=(SimpleNamespace(), SimpleNamespace())),
    )
    monkeypatch.setattr(
        tenant_onboarding,
        "build_entitlement",
        lambda _subscription, _plan: SimpleNamespace(is_write_allowed=True),
    )

    facts = await get_tenant_onboarding_readiness_facts(SimpleNamespace(), tenant)

    assert facts.has_school_profile is True
    assert facts.has_serving_subscription is True
