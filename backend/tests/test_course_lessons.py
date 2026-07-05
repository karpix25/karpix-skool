import uuid

import pytest
from fastapi import HTTPException

from app.models import Course, Lesson, Module, UnlockType
from app.routes import course_lessons
from app.schemas.courses import LessonCreate, LessonUpdate


class FakeSession:
    def __init__(self, objects=None):
        self._objects = {(type(item), item.id): item for item in objects or []}
        self.added = []
        self.committed = False
        self.refreshed = []

    async def get(self, model, item_id):
        return self._objects.get((model, item_id))

    def add(self, item):
        self.added.append(item)

    async def commit(self):
        self.committed = True

    async def refresh(self, item):
        self.refreshed.append(item)


@pytest.mark.asyncio
async def test_create_lesson_persists_access_fields(monkeypatch):
    course = Course(id=uuid.uuid4(), tenant_id=uuid.uuid4(), title="Course")
    module = Module(id=uuid.uuid4(), course_id=course.id, title="Module")
    session = FakeSession([course, module])
    invalidated = []

    async def fake_invalidate_course_write_caches(**kwargs):
        invalidated.append(kwargs)

    monkeypatch.setattr(
        course_lessons,
        "invalidate_course_write_caches",
        fake_invalidate_course_write_caches,
    )

    lesson = await course_lessons.create_lesson(
        LessonCreate(
            title="VIP Lesson",
            is_vip=True,
            unlock_type=UnlockType.level_based,
            unlock_value="3",
        ),
        module,
        session,
    )

    assert lesson.is_vip is True
    assert lesson.unlock_type == UnlockType.level_based
    assert lesson.unlock_value == "3"
    assert session.committed is True
    assert invalidated == [{"course_id": course.id, "tenant_id": course.tenant_id}]


@pytest.mark.asyncio
async def test_create_lesson_sanitizes_content(monkeypatch):
    course = Course(id=uuid.uuid4(), tenant_id=uuid.uuid4(), title="Course")
    module = Module(id=uuid.uuid4(), course_id=course.id, title="Module")
    session = FakeSession([course, module])

    async def fake_invalidate_course_write_caches(**_kwargs):
        return None

    monkeypatch.setattr(
        course_lessons,
        "invalidate_course_write_caches",
        fake_invalidate_course_write_caches,
    )

    lesson = await course_lessons.create_lesson(
        LessonCreate(title="Lesson", content='<p onclick="bad()">Hi</p><script>x()</script>'),
        module,
        session,
    )

    assert lesson.content == "<p>Hi</p>"


@pytest.mark.asyncio
async def test_create_lesson_notifies_when_created_published(monkeypatch):
    course = Course(id=uuid.uuid4(), tenant_id=uuid.uuid4(), title="Course", is_published=True)
    module = Module(id=uuid.uuid4(), course_id=course.id, title="Module")
    session = FakeSession([course, module])
    notified = []

    async def fake_invalidate_course_write_caches(**_kwargs):
        return None

    async def fake_notify_lesson_published(**kwargs):
        notified.append(kwargs["lesson"])

    monkeypatch.setattr(
        course_lessons,
        "invalidate_course_write_caches",
        fake_invalidate_course_write_caches,
    )
    monkeypatch.setattr(course_lessons, "notify_lesson_published", fake_notify_lesson_published)

    lesson = await course_lessons.create_lesson(
        LessonCreate(title="Published", is_published=True),
        module,
        session,
    )

    assert notified == [lesson]


@pytest.mark.asyncio
async def test_patch_lesson_persists_access_fields(monkeypatch):
    course = Course(id=uuid.uuid4(), tenant_id=uuid.uuid4(), title="Course")
    module = Module(id=uuid.uuid4(), course_id=course.id, title="Module")
    lesson = Lesson(id=uuid.uuid4(), module_id=module.id, title="Lesson", is_vip=False)
    session = FakeSession([course, module, lesson])
    invalidated = []

    async def fake_invalidate_course_write_caches(**kwargs):
        invalidated.append(kwargs)

    monkeypatch.setattr(
        course_lessons,
        "invalidate_course_write_caches",
        fake_invalidate_course_write_caches,
    )

    updated = await course_lessons.patch_lesson(
        lesson.id,
        LessonUpdate(
            is_vip=True,
            unlock_type=UnlockType.time_relative,
            unlock_value="7",
        ),
        lesson,
        session,
    )

    assert updated.is_vip is True
    assert updated.unlock_type == UnlockType.time_relative
    assert updated.unlock_value == "7"
    assert session.committed is True
    assert invalidated == [{"course_id": course.id, "tenant_id": course.tenant_id}]


@pytest.mark.asyncio
async def test_patch_lesson_notifies_only_on_first_publish(monkeypatch):
    course = Course(id=uuid.uuid4(), tenant_id=uuid.uuid4(), title="Course", is_published=True)
    module = Module(id=uuid.uuid4(), course_id=course.id, title="Module")
    lesson = Lesson(id=uuid.uuid4(), module_id=module.id, title="Lesson", is_published=False)
    session = FakeSession([course, module, lesson])
    notified = []

    async def fake_invalidate_course_write_caches(**_kwargs):
        return None

    async def fake_notify_lesson_published(**kwargs):
        notified.append(kwargs["lesson"])

    monkeypatch.setattr(
        course_lessons,
        "invalidate_course_write_caches",
        fake_invalidate_course_write_caches,
    )
    monkeypatch.setattr(course_lessons, "notify_lesson_published", fake_notify_lesson_published)

    await course_lessons.patch_lesson(
        lesson.id,
        LessonUpdate(is_published=True),
        lesson,
        session,
    )
    await course_lessons.patch_lesson(
        lesson.id,
        LessonUpdate(title="Edited after publish"),
        lesson,
        session,
    )

    assert notified == [lesson]


@pytest.mark.asyncio
async def test_patch_lesson_sanitizes_content(monkeypatch):
    course = Course(id=uuid.uuid4(), tenant_id=uuid.uuid4(), title="Course")
    module = Module(id=uuid.uuid4(), course_id=course.id, title="Module")
    lesson = Lesson(id=uuid.uuid4(), module_id=module.id, title="Lesson")
    session = FakeSession([course, module, lesson])

    async def fake_invalidate_course_write_caches(**_kwargs):
        return None

    monkeypatch.setattr(
        course_lessons,
        "invalidate_course_write_caches",
        fake_invalidate_course_write_caches,
    )

    updated = await course_lessons.patch_lesson(
        lesson.id,
        LessonUpdate(content='<img src="javascript:bad()" onerror="bad()">'),
        lesson,
        session,
    )

    assert updated.content == "<img>"


@pytest.mark.asyncio
async def test_patch_lesson_rejects_cross_tenant_module_move(monkeypatch):
    source_tenant_id = uuid.uuid4()
    target_tenant_id = uuid.uuid4()
    source_course = Course(id=uuid.uuid4(), tenant_id=source_tenant_id, title="Source")
    target_course = Course(id=uuid.uuid4(), tenant_id=target_tenant_id, title="Target")
    source_module = Module(id=uuid.uuid4(), course_id=source_course.id, title="Source module")
    target_module = Module(id=uuid.uuid4(), course_id=target_course.id, title="Target module")
    lesson = Lesson(id=uuid.uuid4(), module_id=source_module.id, title="Lesson")
    session = FakeSession([source_course, target_course, source_module, target_module, lesson])

    async def fake_invalidate_course_write_caches(**_kwargs):
        raise AssertionError("Cross-tenant move must not invalidate caches")

    monkeypatch.setattr(
        course_lessons,
        "invalidate_course_write_caches",
        fake_invalidate_course_write_caches,
    )

    with pytest.raises(HTTPException) as exc_info:
        await course_lessons.patch_lesson(
            lesson.id,
            LessonUpdate(module_id=target_module.id),
            lesson,
            session,
        )

    assert exc_info.value.status_code == 403
    assert lesson.module_id == source_module.id
    assert session.committed is False
