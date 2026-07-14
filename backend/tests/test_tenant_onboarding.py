import uuid

import pytest

from app.services.tenant_onboarding import _launch_stage, get_tenant_onboarding_status


class FakeResult:
    def __init__(self, *, one_value=None, first_value=None):
        self.one_value = one_value
        self.first_value = first_value

    def one(self):
        return self.one_value

    def first(self):
        return self.first_value


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
        ]
    )

    status = await get_tenant_onboarding_status(session, uuid.uuid4())

    assert status.courses_count == 2
    assert status.published_course_id == published_course_id
    assert status.students_count == 7


@pytest.mark.parametrize(
    ("inputs", "expected"),
    [
        ({"has_owner": False, "has_group": False, "courses_count": 0, "has_published_lesson": False, "students_count": 0}, "invited"),
        ({"has_owner": True, "has_group": False, "courses_count": 0, "has_published_lesson": False, "students_count": 0}, "owner_claimed"),
        ({"has_owner": True, "has_group": True, "courses_count": 0, "has_published_lesson": False, "students_count": 0}, "group_connected"),
        ({"has_owner": True, "has_group": True, "courses_count": 1, "has_published_lesson": False, "students_count": 0}, "course_created"),
        ({"has_owner": True, "has_group": True, "courses_count": 1, "has_published_lesson": True, "students_count": 0}, "lesson_published"),
        ({"has_owner": True, "has_group": True, "courses_count": 1, "has_published_lesson": True, "students_count": 1}, "launched"),
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
        ]
    )

    status = await get_tenant_onboarding_status(session, uuid.uuid4())

    assert status.courses_count == 0
    assert status.published_course_id is None
    assert status.students_count == 0
