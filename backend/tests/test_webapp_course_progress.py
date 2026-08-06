import uuid

import pytest
from starlette.requests import Request

from app.models import Course, Lesson, Module, Tenant, User
from app.routes import webapp_courses
from app.services.webapp.course_access_context import CourseDetailAccessContext
from app.services.webapp.course_progress import get_course_progress_detail


class FakeResult:
    def __init__(self, *, one_or_none_value=None, all_value=None):
        self._one_or_none_value = one_or_none_value
        self._all_value = all_value if all_value is not None else []

    def one_or_none(self):
        return self._one_or_none_value

    def all(self):
        return self._all_value


class FakeSession:
    def __init__(self, exec_results):
        self._exec_results = list(exec_results)

    async def exec(self, _statement):
        if not self._exec_results:
            raise AssertionError("Unexpected database query")
        return self._exec_results.pop(0)


def make_request() -> Request:
    return Request(
        {
            "type": "http",
            "method": "GET",
            "path": "/webapp/courses/course-id",
            "headers": [],
            "query_string": b"",
        }
    )


@pytest.mark.asyncio
async def test_course_progress_detail_summarizes_modules_and_course():
    user_id = uuid.uuid4()
    course_id = uuid.uuid4()
    module_id = uuid.uuid4()
    second_module_id = uuid.uuid4()
    session = FakeSession(
        [
            FakeResult(
                all_value=[
                    (module_id, 2, 1),
                    (second_module_id, 1, 1),
                ],
            ),
        ]
    )

    detail = await get_course_progress_detail(
        session=session,
        user_id=user_id,
        course_id=course_id,
    )

    assert detail.module_progress_by_id[module_id] == {
        "total_lessons": 2,
        "completed_lessons": 1,
        "progress_percent": 50,
    }
    assert detail.module_progress_by_id[second_module_id] == {
        "total_lessons": 1,
        "completed_lessons": 1,
        "progress_percent": 100,
    }
    assert detail.course_progress == {
        "total_lessons": 3,
        "completed_lessons": 2,
        "progress_percent": 66,
    }


@pytest.mark.asyncio
async def test_course_detail_adds_progress_to_each_module(monkeypatch):
    tenant = Tenant(id=uuid.uuid4(), name="School")
    user = User(id=uuid.uuid4(), telegram_id=123, username="student")
    course = Course(
        id=uuid.uuid4(),
        tenant_id=tenant.id,
        title="Course",
        is_published=True,
        content_type="guide",
        category="Основы",
        tags=["ChatGPT"],
    )
    module = Module(id=uuid.uuid4(), course_id=course.id, title="Module", order_index=1)
    completed_lesson = Lesson(
        id=uuid.uuid4(),
        module_id=module.id,
        title="Completed",
        order_index=1,
        is_published=True,
    )
    next_lesson = Lesson(
        id=uuid.uuid4(),
        module_id=module.id,
        title="Next",
        order_index=2,
        is_published=True,
    )
    module.lessons = [next_lesson, completed_lesson]
    course.modules = [module]

    session = FakeSession(
        [
            FakeResult(one_or_none_value=course),
            FakeResult(all_value=[completed_lesson.id]),
            FakeResult(all_value=[(module.id, 2, 1)]),
        ]
    )

    async def fake_build_course_detail_access_context(**_kwargs):
        return CourseDetailAccessContext(tenant=tenant, membership=None, is_admin=True)

    async def fake_check_access(*_args, **_kwargs):
        return False, None

    monkeypatch.setattr(
        webapp_courses,
        "build_course_detail_access_context",
        fake_build_course_detail_access_context,
    )
    monkeypatch.setattr(webapp_courses, "check_access", fake_check_access)
    async def fake_is_course_favorite(**_kwargs):
        return False

    monkeypatch.setattr(webapp_courses, "is_course_favorite", fake_is_course_favorite)

    response = await webapp_courses.get_course_detail(
        str(course.id),
        make_request(),
        session,
        user,
    )

    assert response["total_lessons"] == 2
    assert response["completed_lessons"] == 1
    assert response["progress_percent"] == 50
    assert response["course"]["content_type"] == "guide"
    assert response["course"]["category"] == "Основы"
    assert response["course"]["tags"] == ["ChatGPT"]
    assert response["course"]["is_favorite"] is False

    module_payload = response["modules"][0]
    assert module_payload["total_lessons"] == 2
    assert module_payload["completed_lessons"] == 1
    assert module_payload["progress_percent"] == 50
    assert [lesson["is_completed"] for lesson in module_payload["lessons"]] == [True, False]
