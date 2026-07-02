import uuid

import pytest

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
