import uuid

import pytest

from app.models import Course, Lesson, Module, User
from app.routes import course_reorder
from app.schemas.courses import BulkReorderItem, BulkReorderRequest


class FakeSession:
    def __init__(self, objects=None):
        self._objects = {(type(item), item.id): item for item in objects or []}
        self.added = []
        self.committed = False

    async def get(self, model, item_id):
        return self._objects.get((model, item_id))

    def add(self, item):
        self.added.append(item)

    async def commit(self):
        self.committed = True


@pytest.mark.asyncio
async def test_reorder_modules_accepts_items_payload(monkeypatch):
    course = Course(id=uuid.uuid4(), tenant_id=uuid.uuid4(), title="Course")
    first = Module(id=uuid.uuid4(), course_id=course.id, title="First", order_index=0)
    second = Module(id=uuid.uuid4(), course_id=course.id, title="Second", order_index=1)
    session = FakeSession([course, first, second])
    invalidated = []

    async def fake_ensure_tenant_access(*_args, **_kwargs):
        return None

    async def fake_invalidate_course_write_caches(**kwargs):
        invalidated.append(kwargs)

    monkeypatch.setattr(course_reorder, "ensure_tenant_access", fake_ensure_tenant_access)
    monkeypatch.setattr(course_reorder, "invalidate_course_write_caches", fake_invalidate_course_write_caches)

    result = await course_reorder.reorder_modules(
        BulkReorderRequest(
            items=[
                BulkReorderItem(id=first.id, order_index=1),
                BulkReorderItem(id=second.id, order_index=0),
            ]
        ),
        User(id=uuid.uuid4()),
        session,
    )

    assert result == {"message": "Modules reordered"}
    assert first.order_index == 1
    assert second.order_index == 0
    assert session.committed is True
    assert invalidated == [{"course_id": course.id, "tenant_id": course.tenant_id}]


@pytest.mark.asyncio
async def test_reorder_lessons_accepts_items_payload(monkeypatch):
    course = Course(id=uuid.uuid4(), tenant_id=uuid.uuid4(), title="Course")
    module = Module(id=uuid.uuid4(), course_id=course.id, title="Module")
    first = Lesson(id=uuid.uuid4(), module_id=module.id, title="First", order_index=0)
    second = Lesson(id=uuid.uuid4(), module_id=module.id, title="Second", order_index=1)
    session = FakeSession([course, module, first, second])
    invalidated = []

    async def fake_ensure_tenant_access(*_args, **_kwargs):
        return None

    async def fake_invalidate_course_write_caches(**kwargs):
        invalidated.append(kwargs)

    monkeypatch.setattr(course_reorder, "ensure_tenant_access", fake_ensure_tenant_access)
    monkeypatch.setattr(course_reorder, "invalidate_course_write_caches", fake_invalidate_course_write_caches)

    result = await course_reorder.reorder_lessons(
        BulkReorderRequest(
            items=[
                BulkReorderItem(id=first.id, order_index=1),
                BulkReorderItem(id=second.id, order_index=0),
            ]
        ),
        User(id=uuid.uuid4()),
        session,
    )

    assert result == {"message": "Lessons reordered"}
    assert first.order_index == 1
    assert second.order_index == 0
    assert session.committed is True
    assert invalidated == [{"course_id": course.id, "tenant_id": course.tenant_id}]
