import uuid

import pytest

from app.models import Course, Module
from app.routes import course_modules
from app.schemas.courses import ModuleCreate, ModuleUpdate


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
async def test_create_module_persists_vip_flag(monkeypatch):
    course = Course(id=uuid.uuid4(), tenant_id=uuid.uuid4(), title="Course")
    session = FakeSession([course])
    invalidated = []

    async def fake_invalidate_course_write_caches(**kwargs):
        invalidated.append(kwargs)

    monkeypatch.setattr(
        course_modules,
        "invalidate_course_write_caches",
        fake_invalidate_course_write_caches,
    )

    module = await course_modules.create_module(
        ModuleCreate(title="VIP Module", is_vip=True),
        course,
        session,
    )

    assert module.is_vip is True
    assert session.committed is True
    assert session.refreshed == [module]
    assert invalidated == [{"course_id": course.id, "tenant_id": course.tenant_id}]


@pytest.mark.asyncio
async def test_create_module_notifies_when_course_is_published(monkeypatch):
    course = Course(id=uuid.uuid4(), tenant_id=uuid.uuid4(), title="Course", is_published=True)
    session = FakeSession([course])
    notified = []

    async def fake_invalidate_course_write_caches(**_kwargs):
        return None

    async def fake_notify_module_published(**kwargs):
        notified.append(kwargs["module"])

    monkeypatch.setattr(
        course_modules,
        "invalidate_course_write_caches",
        fake_invalidate_course_write_caches,
    )
    monkeypatch.setattr(course_modules, "notify_module_published", fake_notify_module_published)

    module = await course_modules.create_module(
        ModuleCreate(title="New Module"),
        course,
        session,
    )

    assert notified == [module]


@pytest.mark.asyncio
async def test_patch_module_persists_vip_flag(monkeypatch):
    course = Course(id=uuid.uuid4(), tenant_id=uuid.uuid4(), title="Course")
    module = Module(id=uuid.uuid4(), course_id=course.id, title="Module", is_vip=False)
    session = FakeSession([course, module])
    invalidated = []

    async def fake_invalidate_course_write_caches(**kwargs):
        invalidated.append(kwargs)

    monkeypatch.setattr(
        course_modules,
        "invalidate_course_write_caches",
        fake_invalidate_course_write_caches,
    )

    updated = await course_modules.patch_module(
        ModuleUpdate(is_vip=True),
        module,
        session,
    )

    assert updated.is_vip is True
    assert session.committed is True
    assert invalidated == [{"course_id": course.id, "tenant_id": course.tenant_id}]
