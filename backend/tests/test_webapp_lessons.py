import uuid

import pytest
from fastapi import BackgroundTasks, HTTPException

from app.models import (
    Course,
    CourseUnlockType,
    Lesson,
    LessonProgress,
    MemberStatus,
    Module,
    Tenant,
    TenantMember,
    UnlockType,
    User,
    VideoProvider,
    XPEvent,
)
from app.services.webapp import lesson_completion
from app.services.webapp.lesson_completion import complete_webapp_lesson
from app.services.webapp.lesson_access import (
    LOCKED_LESSON_CONTENT,
    get_lesson_context,
    lesson_webapp_payload,
)


class FakeResult:
    def __init__(self, *, first_value=None, all_value=None):
        self._first_value = first_value
        self._all_value = all_value if all_value is not None else []

    def first(self):
        return self._first_value

    def all(self):
        return self._all_value


class FakeTransaction:
    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc, tb):
        return False


class FakeSession:
    def __init__(self, objects, exec_results):
        self._objects = {(type(item), item.id): item for item in objects}
        self._exec_results = list(exec_results)
        self.added = []
        self.committed = False
        self.flushed = False

    async def get(self, model, item_id):
        return self._objects.get((model, item_id))

    async def exec(self, _statement):
        if not self._exec_results:
            raise AssertionError("Unexpected database query")
        return self._exec_results.pop(0)

    def add(self, item):
        self.added.append(item)

    def begin_nested(self):
        return FakeTransaction()

    async def flush(self):
        self.flushed = True

    async def commit(self):
        self.committed = True


def lesson_fixture(*, lesson_unlock_type=UnlockType.immediate, lesson_unlock_value=None):
    tenant = Tenant(id=uuid.uuid4(), name="School")
    user = User(id=uuid.uuid4(), telegram_id=123, username="student")
    member = TenantMember(tenant_id=tenant.id, user_id=user.id, level=1, xp=0)
    course = Course(
        id=uuid.uuid4(),
        tenant_id=tenant.id,
        title="Course",
        unlock_type=CourseUnlockType.open,
        is_published=True,
    )
    module = Module(
        id=uuid.uuid4(),
        course_id=course.id,
        title="Module",
        unlock_type=UnlockType.immediate,
    )
    lesson = Lesson(
        id=uuid.uuid4(),
        module_id=module.id,
        title="Lesson",
        is_published=True,
        unlock_type=lesson_unlock_type,
        unlock_value=lesson_unlock_value,
    )
    return tenant, user, member, course, module, lesson


@pytest.mark.asyncio
async def test_complete_lesson_rejects_locked_lesson_before_progress_or_xp(monkeypatch):
    tenant, user, member, course, module, lesson = lesson_fixture(
        lesson_unlock_type=UnlockType.level_based,
        lesson_unlock_value="3",
    )
    session = FakeSession(
        [tenant, course, module, lesson],
        [
            FakeResult(first_value=None),
            FakeResult(first_value=member),
        ],
    )
    invalidated = []

    async def fake_invalidate_lesson_completion_caches(**kwargs):
        invalidated.append(kwargs)

    monkeypatch.setattr(
        lesson_completion,
        "invalidate_lesson_completion_caches",
        fake_invalidate_lesson_completion_caches,
    )

    with pytest.raises(HTTPException) as exc_info:
        await complete_webapp_lesson(
            lesson_id=lesson.id,
            background_tasks=BackgroundTasks(),
            current_user=user,
            session=session,
        )

    assert exc_info.value.status_code == 403
    assert "3" in exc_info.value.detail
    assert session.added == []
    assert session.committed is False
    assert member.xp == 0
    assert invalidated == []


@pytest.mark.asyncio
async def test_complete_lesson_rejects_missing_membership_before_progress_or_xp(monkeypatch):
    tenant, user, _member, course, module, lesson = lesson_fixture()
    session = FakeSession(
        [tenant, course, module, lesson],
        [
            FakeResult(first_value=None),
            FakeResult(first_value=None),
        ],
    )
    invalidated = []

    async def fake_invalidate_lesson_completion_caches(**kwargs):
        invalidated.append(kwargs)

    monkeypatch.setattr(
        lesson_completion,
        "invalidate_lesson_completion_caches",
        fake_invalidate_lesson_completion_caches,
    )

    with pytest.raises(HTTPException) as exc_info:
        await complete_webapp_lesson(
            lesson_id=lesson.id,
            background_tasks=BackgroundTasks(),
            current_user=user,
            session=session,
        )

    assert exc_info.value.status_code == 403
    assert session.added == []
    assert session.committed is False
    assert invalidated == []


@pytest.mark.asyncio
async def test_complete_lesson_rejects_paused_membership_before_progress_or_xp(monkeypatch):
    tenant, user, member, course, module, lesson = lesson_fixture()
    member.status = MemberStatus.paused
    session = FakeSession(
        [tenant, course, module, lesson],
        [
            FakeResult(first_value=None),
            FakeResult(first_value=member),
        ],
    )
    invalidated = []

    async def fake_invalidate_lesson_completion_caches(**kwargs):
        invalidated.append(kwargs)

    monkeypatch.setattr(
        lesson_completion,
        "invalidate_lesson_completion_caches",
        fake_invalidate_lesson_completion_caches,
    )

    with pytest.raises(HTTPException) as exc_info:
        await complete_webapp_lesson(
            lesson_id=lesson.id,
            background_tasks=BackgroundTasks(),
            current_user=user,
            session=session,
        )

    assert exc_info.value.status_code == 403
    assert session.added == []
    assert session.committed is False
    assert member.xp == 0
    assert invalidated == []


@pytest.mark.asyncio
async def test_complete_lesson_records_progress_and_xp_when_lesson_is_unlocked(monkeypatch):
    tenant, user, member, course, module, lesson = lesson_fixture()
    session = FakeSession(
        [tenant, course, module, lesson],
        [
            FakeResult(first_value=None),
            FakeResult(first_value=member),
            FakeResult(first_value=None),
            FakeResult(first_value=None),
            FakeResult(first_value=member),
            FakeResult(all_value=[(module.id, 1, 1)]),
        ],
    )
    invalidated = []

    async def fake_invalidate_lesson_completion_caches(**kwargs):
        invalidated.append(kwargs)

    monkeypatch.setattr(
        lesson_completion,
        "invalidate_lesson_completion_caches",
        fake_invalidate_lesson_completion_caches,
    )

    response = await complete_webapp_lesson(
        lesson_id=lesson.id,
        background_tasks=BackgroundTasks(),
        current_user=user,
        session=session,
    )

    assert response["message"] == "Lesson completed!"
    assert response["xp_granted"] == 10
    assert response["new_xp"] == 10
    assert response["module_progress"] == {
        "module_id": str(module.id),
        "title": module.title,
        "total_lessons": 1,
        "completed_lessons": 1,
        "progress_percent": 100,
    }
    assert response["course_progress"] == {
        "course_id": str(course.id),
        "total_lessons": 1,
        "completed_lessons": 1,
        "progress_percent": 100,
    }
    assert any(isinstance(item, LessonProgress) for item in session.added)
    assert any(isinstance(item, XPEvent) for item in session.added)
    assert member in session.added
    assert session.committed is True
    assert invalidated == [
        {
            "course_id": course.id,
            "tenant_id": tenant.id,
            "user_id": user.id,
        }
    ]


@pytest.mark.asyncio
async def test_complete_lesson_existing_progress_does_not_award_xp(monkeypatch):
    tenant, user, member, course, module, lesson = lesson_fixture()
    progress = LessonProgress(user_id=user.id, lesson_id=lesson.id)
    session = FakeSession(
        [tenant, course, module, lesson],
        [
            FakeResult(first_value=None),
            FakeResult(first_value=member),
            FakeResult(first_value=progress),
            FakeResult(all_value=[(module.id, 1, 1)]),
        ],
    )
    invalidated = []

    async def fake_invalidate_lesson_completion_caches(**kwargs):
        invalidated.append(kwargs)

    monkeypatch.setattr(
        lesson_completion,
        "invalidate_lesson_completion_caches",
        fake_invalidate_lesson_completion_caches,
    )

    response = await complete_webapp_lesson(
        lesson_id=lesson.id,
        background_tasks=BackgroundTasks(),
        current_user=user,
        session=session,
    )

    assert response == {
        "message": "Already completed",
        "xp_granted": 0,
        "new_xp": 0,
        "new_level": 1,
        "module_progress": {
            "module_id": str(module.id),
            "title": module.title,
            "total_lessons": 1,
            "completed_lessons": 1,
            "progress_percent": 100,
        },
        "course_progress": {
            "course_id": str(course.id),
            "total_lessons": 1,
            "completed_lessons": 1,
            "progress_percent": 100,
        },
    }
    assert session.added == []
    assert session.committed is False
    assert member.xp == 0
    assert invalidated == []


def test_lesson_webapp_payload_exposes_lock_state_and_masks_locked_content():
    lesson = Lesson(
        id=uuid.uuid4(),
        module_id=uuid.uuid4(),
        title="Locked Lesson",
        video_id="youtube-id",
        video_provider=VideoProvider.youtube_unlisted,
        content="<p>secret</p>",
        cover_url="/upload/files/oblozhki/secret.jpg",
        icon_emoji="🔒",
        mux_upload_id="upload",
        mux_asset_id="asset",
        mux_playback_id="playback",
        mux_status="ready",
    )

    payload = lesson_webapp_payload(
        lesson,
        is_locked=True,
        lock_reason="Locked",
        is_completed=False,
    )

    assert payload["is_locked"] is True
    assert payload["lock_reason"] == "Locked"
    assert payload["is_completed"] is False
    assert payload["cover_url"] is None
    assert payload["icon_emoji"] == "🔒"
    assert payload["video_provider"] is None
    assert payload["video_id"] == ""
    assert payload["content"] == LOCKED_LESSON_CONTENT
    assert payload["mux_upload_id"] is None
    assert payload["mux_asset_id"] is None
    assert payload["mux_playback_id"] is None
    assert payload["mux_status"] is None


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("course_published", "lesson_published"),
    [(False, True), (True, False)],
)
async def test_unpublished_learning_content_is_not_available_in_webapp_context(
    course_published,
    lesson_published,
):
    _, _, _, course, module, lesson = lesson_fixture()
    course.is_published = course_published
    lesson.is_published = lesson_published
    session = FakeSession([course, module], [])

    with pytest.raises(HTTPException) as exc_info:
        await get_lesson_context(session, lesson)

    assert exc_info.value.status_code == 404
