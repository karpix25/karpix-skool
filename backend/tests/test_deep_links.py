import uuid

import pytest
from fastapi import HTTPException

from app.config import settings
from app.models import Course, Lesson, Module, Tenant, TenantMember, User
from app.routes.course_lessons import get_lesson_share_link
from app.routes.course_modules import get_module_share_link
from app.services.deep_links import (
    build_bot_start_link,
    build_course_start_param,
    build_lesson_bot_start_link,
    build_lesson_start_param,
    build_module_start_param,
    build_mini_app_link,
    parse_start_param,
    resolve_start_param,
)


class FakeResult:
    def __init__(self, first_value=None):
        self._first_value = first_value

    def first(self):
        return self._first_value


class FakeSession:
    def __init__(self, objects, exec_results):
        self._objects = {(type(item), item.id): item for item in objects}
        self._exec_results = list(exec_results)

    async def get(self, model, item_id):
        return self._objects.get((model, item_id))

    async def exec(self, _statement):
        if not self._exec_results:
            raise AssertionError("Unexpected database query")
        return self._exec_results.pop(0)


def make_lesson_context():
    tenant = Tenant(id=uuid.uuid4(), name="School")
    user = User(id=uuid.uuid4(), telegram_id=123, username="student")
    member = TenantMember(tenant_id=tenant.id, user_id=user.id, xp=0, level=1)
    course = Course(id=uuid.uuid4(), tenant_id=tenant.id, title="Course", is_published=True)
    module = Module(id=uuid.uuid4(), course_id=course.id, title="Module")
    lesson = Lesson(id=uuid.uuid4(), module_id=module.id, title="Lesson", is_published=True)
    return tenant, user, member, course, module, lesson


def test_build_lesson_start_param_and_mini_app_link(monkeypatch):
    lesson_id = uuid.uuid4()
    monkeypatch.setattr(settings, "BOT_USERNAME", "@karpix_shkola_bot")
    monkeypatch.setattr(settings, "APP_SHORT_NAME", "app")

    start_param = build_lesson_start_param(lesson_id)

    assert start_param == f"lesson_{lesson_id}"
    assert build_mini_app_link(start_param) == (
        f"https://t.me/karpix_shkola_bot/app?startapp=lesson_{lesson_id}"
    )
    assert build_lesson_bot_start_link(lesson_id) == (
        f"https://t.me/karpix_shkola_bot?start=lesson_{lesson_id}"
    )


def test_build_course_start_param_and_mini_app_link(monkeypatch):
    course_id = uuid.uuid4()
    monkeypatch.setattr(settings, "BOT_USERNAME", "@karpix_shkola_bot")
    monkeypatch.setattr(settings, "APP_SHORT_NAME", "app")

    start_param = build_course_start_param(course_id)

    assert start_param == f"course_{course_id}"
    assert build_mini_app_link(start_param) == (
        f"https://t.me/karpix_shkola_bot/app?startapp=course_{course_id}"
    )


def test_build_bot_start_link_rejects_payloads_too_long_for_telegram(monkeypatch):
    monkeypatch.setattr(settings, "BOT_USERNAME", "@karpix_shkola_bot")

    with pytest.raises(HTTPException) as exc_info:
        build_bot_start_link("x" * 65)

    assert exc_info.value.status_code == 400
    assert exc_info.value.detail == "Bot start link is too long"


def test_build_module_start_param_and_mini_app_link(monkeypatch):
    module_id = uuid.uuid4()
    monkeypatch.setattr(settings, "BOT_USERNAME", "@karpix_shkola_bot")
    monkeypatch.setattr(settings, "APP_SHORT_NAME", "app")

    start_param = build_module_start_param(module_id)

    assert start_param == f"module_{module_id}"
    assert build_mini_app_link(start_param) == (
        f"https://t.me/karpix_shkola_bot/app?startapp=module_{module_id}"
    )


def test_parse_start_param_rejects_invalid_lesson_payload():
    with pytest.raises(HTTPException) as exc_info:
        parse_start_param("lesson_not-a-uuid")

    assert exc_info.value.status_code == 400


@pytest.mark.asyncio
async def test_resolve_start_param_returns_tenant_and_target_path():
    tenant, user, member, course, module, lesson = make_lesson_context()
    session = FakeSession(
        [tenant, course, module, lesson],
        [
            FakeResult(first_value=None),
            FakeResult(first_value=member),
        ],
    )

    resolved = await resolve_start_param(
        start_param=build_lesson_start_param(lesson.id),
        current_user=user,
        session=session,
    )

    assert resolved["type"] == "lesson"
    assert resolved["lesson_id"] == str(lesson.id)
    assert resolved["course_id"] == str(course.id)
    assert resolved["tenant_id"] == str(tenant.id)
    assert resolved["target_path"] == f"/lesson/{lesson.id}"
    assert resolved["is_locked"] is False


@pytest.mark.asyncio
async def test_resolve_lesson_start_param_for_non_member_returns_join_preview():
    tenant, user, _member, course, module, lesson = make_lesson_context()
    tenant.free_group_link = "@aikarlo"
    lesson.content = "<p>Secret lesson body</p>"
    lesson.video_id = "secret-video"
    lesson.mux_playback_id = "secret-mux"
    session = FakeSession(
        [tenant, course, module, lesson],
        [
            FakeResult(first_value=None),
            FakeResult(first_value=None),
        ],
    )

    resolved = await resolve_start_param(
        start_param=build_lesson_start_param(lesson.id),
        current_user=user,
        session=session,
    )

    assert resolved["type"] == "lesson"
    assert resolved["requires_group_join"] is True
    assert resolved["access_status"] == "group_required"
    assert resolved["lesson_title"] == "Lesson"
    assert resolved["course_title"] == "Course"
    assert resolved["free_group_link"] == "https://t.me/aikarlo"
    assert resolved["target_path"] == f"/lesson/{lesson.id}"
    assert "content" not in resolved
    assert "video_id" not in resolved
    assert "mux_playback_id" not in resolved


@pytest.mark.asyncio
async def test_resolve_module_start_param_returns_course_anchor_path():
    tenant, user, member, course, module, _lesson = make_lesson_context()
    session = FakeSession(
        [tenant, course, module],
        [
            FakeResult(first_value=None),
            FakeResult(first_value=member),
        ],
    )

    resolved = await resolve_start_param(
        start_param=build_module_start_param(module.id),
        current_user=user,
        session=session,
    )

    assert resolved["type"] == "module"
    assert resolved["module_id"] == str(module.id)
    assert resolved["course_id"] == str(course.id)
    assert resolved["tenant_id"] == str(tenant.id)
    assert resolved["target_path"] == f"/course/{course.id}?moduleId={module.id}"
    assert resolved["is_locked"] is False


@pytest.mark.asyncio
async def test_resolve_course_start_param_returns_target_path():
    tenant, user, member, course, _module, _lesson = make_lesson_context()
    session = FakeSession(
        [tenant, course],
        [
            FakeResult(first_value=member),
            FakeResult(first_value=None),
        ],
    )

    resolved = await resolve_start_param(
        start_param=build_course_start_param(course.id),
        current_user=user,
        session=session,
    )

    assert resolved["type"] == "course"
    assert resolved["course_id"] == str(course.id)
    assert resolved["tenant_id"] == str(tenant.id)
    assert resolved["target_path"] == f"/course/{course.id}"
    assert resolved["is_locked"] is False


@pytest.mark.asyncio
async def test_lesson_share_link_uses_admin_managed_lesson(monkeypatch):
    lesson = Lesson(id=uuid.uuid4(), module_id=uuid.uuid4(), title="Lesson")
    monkeypatch.setattr(settings, "BOT_USERNAME", "karpix_shkola_bot")
    monkeypatch.setattr(settings, "APP_SHORT_NAME", "karpix")

    response = await get_lesson_share_link(lesson)

    assert response == {
        "url": f"https://t.me/karpix_shkola_bot?start=lesson_{lesson.id}",
        "start_param": f"lesson_{lesson.id}",
    }


@pytest.mark.asyncio
async def test_module_share_link_uses_admin_managed_module(monkeypatch):
    module = Module(id=uuid.uuid4(), course_id=uuid.uuid4(), title="Module")
    monkeypatch.setattr(settings, "BOT_USERNAME", "karpix_shkola_bot")
    monkeypatch.setattr(settings, "APP_SHORT_NAME", "karpix")

    response = await get_module_share_link(module)

    assert response == {
        "url": f"https://t.me/karpix_shkola_bot/karpix?startapp=module_{module.id}",
        "start_param": f"module_{module.id}",
    }
