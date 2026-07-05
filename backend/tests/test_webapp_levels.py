import uuid
from types import SimpleNamespace

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from starlette.requests import Request

from app.db import get_session
from app.models import CourseUnlockType, TenantMember, UnlockType, User
from app.routes import webapp_levels
from app.routes.auth import get_current_user
from app.schemas.webapp_levels import WebAppLevelsResponse
from app.services.webapp import levels
from app.services.webapp.course_access_context import CourseListAccessContext
from app.services.xp_ledger import LEVEL_THRESHOLDS


class FakeResult:
    def __init__(self, rows):
        self._rows = rows

    def all(self):
        return self._rows


class FakeSession:
    def __init__(self, result_sets):
        self._result_sets = list(result_sets)
        self.exec_count = 0

    async def exec(self, _statement):
        self.exec_count += 1
        if not self._result_sets:
            raise AssertionError("Unexpected query")
        return FakeResult(self._result_sets.pop(0))


def make_request() -> Request:
    return Request(
        {
            "type": "http",
            "method": "GET",
            "path": "/webapp/levels",
            "headers": [],
            "query_string": b"",
        }
    )


def course_row(*, tenant_id, course_id=None, title="Course", unlock_value="3"):
    return SimpleNamespace(
        course_id=course_id or uuid.uuid4(),
        tenant_id=tenant_id,
        course_title=title,
        is_vip=False,
        unlock_type=CourseUnlockType.level_based,
        unlock_value=unlock_value,
    )


def module_row(
    *,
    tenant_id,
    course_id=None,
    module_id=None,
    title="Module",
    course_unlock_type=CourseUnlockType.open,
    course_unlock_value=None,
    module_unlock_value="3",
):
    return SimpleNamespace(
        course_id=course_id or uuid.uuid4(),
        tenant_id=tenant_id,
        course_title="Course",
        course_is_vip=False,
        course_unlock_type=course_unlock_type,
        course_unlock_value=course_unlock_value,
        module_id=module_id or uuid.uuid4(),
        module_title=title,
        module_is_vip=False,
        unlock_type=UnlockType.level_based,
        unlock_value=module_unlock_value,
        order_index=1,
    )


def lesson_row(
    *,
    tenant_id,
    course_id=None,
    module_id=None,
    lesson_id=None,
    title="Lesson",
    course_unlock_type=CourseUnlockType.open,
    course_unlock_value=None,
    module_unlock_type=UnlockType.immediate,
    module_unlock_value=None,
    unlock_value="4",
):
    return SimpleNamespace(
        course_id=course_id or uuid.uuid4(),
        tenant_id=tenant_id,
        course_title="Course",
        course_is_vip=False,
        course_unlock_type=course_unlock_type,
        course_unlock_value=course_unlock_value,
        module_id=module_id or uuid.uuid4(),
        module_title="Module",
        module_is_vip=False,
        module_unlock_type=module_unlock_type,
        module_unlock_value=module_unlock_value,
        lesson_id=lesson_id or uuid.uuid4(),
        lesson_title=title,
        lesson_is_vip=False,
        unlock_type=UnlockType.level_based,
        unlock_value=unlock_value,
        order_index=2,
    )


def test_parse_level_unlock_uses_ledger_levels_and_skips_malformed_values():
    assert levels.parse_level_unlock(UnlockType.level_based, "3") == 3
    assert levels.parse_level_unlock(CourseUnlockType.level_based, "not-a-level") is None
    assert levels.parse_level_unlock(UnlockType.level_based, "999") is None
    assert levels.parse_level_unlock(UnlockType.immediate, "3") is None


def test_child_unlocks_inherit_parent_level_requirement():
    tenant_id = uuid.uuid4()

    module_unlock = levels._module_unlock_from_row(
        module_row(
            tenant_id=tenant_id,
            course_unlock_type=CourseUnlockType.level_based,
            course_unlock_value="5",
            module_unlock_value="3",
        )
    )
    lesson_unlock = levels._lesson_unlock_from_row(
        lesson_row(
            tenant_id=tenant_id,
            course_unlock_type=CourseUnlockType.level_based,
            course_unlock_value="5",
            module_unlock_type=UnlockType.level_based,
            module_unlock_value="4",
            unlock_value="3",
        )
    )

    assert module_unlock is not None
    assert module_unlock.required_level == 5
    assert lesson_unlock is not None
    assert lesson_unlock.required_level == 5


def test_child_unlock_is_skipped_when_parent_is_not_level_opened():
    tenant_id = uuid.uuid4()

    module_unlock = levels._module_unlock_from_row(
        module_row(
            tenant_id=tenant_id,
            course_unlock_type=CourseUnlockType.time_relative,
            course_unlock_value="7",
        )
    )
    lesson_unlock = levels._lesson_unlock_from_row(
        lesson_row(
            tenant_id=tenant_id,
            module_unlock_type=UnlockType.time_relative,
            module_unlock_value="7",
        )
    )

    assert module_unlock is None
    assert lesson_unlock is None


def test_build_level_milestones_uses_xp_ledger_thresholds():
    milestones = levels.build_level_milestones([])

    assert [(item.level, item.xp_threshold) for item in milestones] == sorted(
        LEVEL_THRESHOLDS.items()
    )


def test_build_xp_sources_documents_real_award_rules():
    sources = {source.source_type: source for source in levels.build_xp_sources()}

    assert sources["lesson"].points == 10
    assert sources["message"].points == 1
    assert sources["message"].limit == "до 20 XP в час"
    assert sources["reaction"].points == 2


@pytest.mark.asyncio
async def test_levels_response_filters_to_access_context_tenants_and_safe_fields(monkeypatch):
    allowed_tenant_id = uuid.uuid4()
    foreign_tenant_id = uuid.uuid4()
    user = User(id=uuid.uuid4(), username="student")
    membership = TenantMember(
        tenant_id=allowed_tenant_id,
        user_id=user.id,
        xp=120,
        level=3,
    )
    fake_session = FakeSession(
        [
            [course_row(tenant_id=allowed_tenant_id), course_row(tenant_id=foreign_tenant_id)],
            [],
            [lesson_row(tenant_id=allowed_tenant_id, title="Published lesson")],
        ]
    )

    async def fake_access_context(**_kwargs):
        return CourseListAccessContext(
            tenant_ids=[allowed_tenant_id],
            active_tenants={},
            membership_by_tenant={allowed_tenant_id: membership},
        )

    monkeypatch.setattr(levels, "build_course_list_access_context", fake_access_context)

    response = await levels.build_webapp_levels_response(
        session=fake_session,
        request=make_request(),
        current_user=user,
    )
    payload = response.model_dump()

    unlocks = [
        unlock
        for milestone in payload["milestones"]
        for unlock in milestone["unlocks"]
    ]
    assert {unlock["tenant_id"] for unlock in unlocks} == {allowed_tenant_id}
    assert payload["memberships"] == [
        {"tenant_id": allowed_tenant_id, "xp": 120, "level": 3}
    ]
    assert fake_session.exec_count == 3
    assert all("content" not in unlock for unlock in unlocks)
    assert all("video_id" not in unlock for unlock in unlocks)
    assert all("mux_playback_id" not in unlock for unlock in unlocks)
    assert {source["source_type"] for source in payload["xp_sources"]} == {
        "lesson",
        "message",
        "reaction",
    }


@pytest.mark.asyncio
async def test_levels_response_does_not_query_unlocks_without_access(monkeypatch):
    fake_session = FakeSession([])
    user = User(id=uuid.uuid4(), username="student")

    async def fake_access_context(**_kwargs):
        return CourseListAccessContext(
            tenant_ids=[],
            active_tenants={},
            membership_by_tenant={},
        )

    monkeypatch.setattr(levels, "build_course_list_access_context", fake_access_context)

    response = await levels.build_webapp_levels_response(
        session=fake_session,
        request=make_request(),
        current_user=user,
    )

    assert fake_session.exec_count == 0
    assert response.memberships == []
    assert [source.source_type for source in response.xp_sources] == [
        "lesson",
        "message",
        "reaction",
    ]
    assert [(item.level, item.xp_threshold) for item in response.milestones] == sorted(
        LEVEL_THRESHOLDS.items()
    )


def test_webapp_levels_route_returns_service_response(monkeypatch):
    tenant_id = uuid.uuid4()
    user = User(id=uuid.uuid4(), username="student")
    app = FastAPI()
    app.include_router(webapp_levels.router, prefix="/webapp")

    async def override_session():
        return object()

    async def override_current_user():
        return user

    async def fake_build_webapp_levels_response(**kwargs):
        assert kwargs["current_user"] == user
        assert kwargs["tenant_id"] == tenant_id
        return WebAppLevelsResponse(
            milestones=levels.build_level_milestones([]),
            memberships=[],
        )

    monkeypatch.setattr(
        webapp_levels,
        "build_webapp_levels_response",
        fake_build_webapp_levels_response,
    )
    app.dependency_overrides[get_session] = override_session
    app.dependency_overrides[get_current_user] = override_current_user

    response = TestClient(app).get(f"/webapp/levels?tenant_id={tenant_id}")

    assert response.status_code == 200
    assert response.json()["memberships"] == []
    assert len(response.json()["milestones"]) == len(LEVEL_THRESHOLDS)
