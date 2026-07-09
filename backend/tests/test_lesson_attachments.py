from dataclasses import dataclass
from datetime import datetime
import uuid

import pytest
from fastapi import HTTPException

from app.models import Course, Lesson, LessonAttachment, Module, User
from app.routes import course_lesson_attachments, webapp_lesson_attachments, webapp_lessons
from app.services import lesson_attachments


class FakeResult:
    def __init__(self, *, all_value=None, first_value=None, one_or_none_value=None):
        self._all_value = all_value if all_value is not None else []
        self._first_value = first_value
        self._one_or_none_value = one_or_none_value

    def all(self):
        return self._all_value

    def first(self):
        return self._first_value

    def one_or_none(self):
        return self._one_or_none_value


class FakeSession:
    def __init__(self, objects=None, exec_results=None):
        self._objects = {(type(item), item.id): item for item in objects or []}
        self._exec_results = list(exec_results or [])
        self.added = []
        self.committed = False
        self.refreshed = []

    async def get(self, model, item_id):
        return self._objects.get((model, item_id))

    async def exec(self, _statement):
        if not self._exec_results:
            raise AssertionError("Unexpected database query")
        return self._exec_results.pop(0)

    def add(self, item):
        self.added.append(item)

    async def commit(self):
        self.committed = True

    async def refresh(self, item):
        self.refreshed.append(item)


class FakeStorage:
    def __init__(self):
        self.deleted = []
        self.reads = []

    async def delete_file(self, key: str):
        self.deleted.append(key)

    async def read_file(self, key: str):
        self.reads.append(key)
        return b"file-bytes", "application/pdf"


@dataclass(frozen=True)
class FakeAccess:
    course: Course
    is_locked: bool
    module: Module | None = None
    lock_reason: str | None = None


def lesson_context():
    tenant_id = uuid.uuid4()
    course = Course(id=uuid.uuid4(), tenant_id=tenant_id, title="Course", is_published=True)
    module = Module(id=uuid.uuid4(), course_id=course.id, title="Module")
    lesson = Lesson(id=uuid.uuid4(), module_id=module.id, title="Lesson", is_published=True)
    attachment = LessonAttachment(
        id=uuid.uuid4(),
        tenant_id=tenant_id,
        lesson_id=lesson.id,
        filename="guide.pdf",
        content_type="application/pdf",
        size_bytes=123,
        storage_key=f"lesson-attachments/{tenant_id}/{lesson.id}/guide.pdf",
        display_order=0,
        created_at=datetime.utcnow(),
    )
    return course, module, lesson, attachment


@pytest.mark.asyncio
async def test_admin_list_lesson_attachments_scopes_to_managed_lesson_context():
    course, module, lesson, attachment = lesson_context()
    session = FakeSession(
        [course, module, lesson],
        [FakeResult(all_value=[attachment])],
    )

    attachments = await course_lesson_attachments.list_admin_lesson_attachments(lesson, session)

    assert attachments == [attachment]


@pytest.mark.asyncio
async def test_admin_delete_lesson_attachment_deletes_r2_object_and_soft_deletes(monkeypatch):
    course, module, lesson, attachment = lesson_context()
    session = FakeSession(
        [course, module, lesson, attachment],
        [FakeResult(first_value=(course.id, course.tenant_id))],
    )
    fake_storage = FakeStorage()
    monkeypatch.setattr(lesson_attachments, "storage", fake_storage)

    response = await course_lesson_attachments.delete_admin_lesson_attachment(
        attachment.id,
        lesson,
        session,
    )

    assert response.status_code == 204
    assert fake_storage.deleted == [attachment.storage_key]
    assert attachment.deleted_at is not None
    assert attachment in session.added
    assert session.committed is True


@pytest.mark.asyncio
async def test_attachment_read_rejects_cross_tenant_lookup_before_r2(monkeypatch):
    course, module, lesson, attachment = lesson_context()
    session = FakeSession([course, module, lesson, attachment])
    fake_storage = FakeStorage()
    monkeypatch.setattr(lesson_attachments, "storage", fake_storage)

    with pytest.raises(HTTPException) as exc_info:
        await lesson_attachments.read_lesson_attachment_file(
            session=session,
            attachment_id=attachment.id,
            tenant_id=uuid.uuid4(),
            lesson_id=lesson.id,
        )

    assert exc_info.value.status_code == 404
    assert fake_storage.reads == []


@pytest.mark.asyncio
async def test_student_download_rejects_locked_lesson_before_r2(monkeypatch):
    course, module, lesson, attachment = lesson_context()
    session = FakeSession([course, module, lesson, attachment])
    current_user = User(id=uuid.uuid4(), telegram_id=123)

    async def fake_get_lesson_access_state(**_kwargs):
        return FakeAccess(course=course, is_locked=True, lock_reason="Unlock level 3")

    async def fail_if_downloaded(**_kwargs):
        raise AssertionError("Locked lesson attachments must not read from R2")

    monkeypatch.setattr(webapp_lesson_attachments, "get_lesson_access_state", fake_get_lesson_access_state)
    monkeypatch.setattr(webapp_lesson_attachments, "read_lesson_attachment_file", fail_if_downloaded)

    with pytest.raises(HTTPException) as exc_info:
        await webapp_lesson_attachments.download_lesson_attachment(
            lesson.id,
            attachment.id,
            session,
            current_user,
        )

    assert exc_info.value.status_code == 403
    assert exc_info.value.detail == "Unlock level 3"


@pytest.mark.asyncio
async def test_student_download_reads_attachment_with_access_tenant(monkeypatch):
    course, module, lesson, attachment = lesson_context()
    session = FakeSession([course, module, lesson, attachment])
    current_user = User(id=uuid.uuid4(), telegram_id=123)
    read_kwargs = {}

    async def fake_get_lesson_access_state(**_kwargs):
        return FakeAccess(course=course, is_locked=False)

    async def fake_read_lesson_attachment_file(**kwargs):
        read_kwargs.update(kwargs)
        return attachment, b"pdf-bytes", "application/pdf"

    monkeypatch.setattr(webapp_lesson_attachments, "get_lesson_access_state", fake_get_lesson_access_state)
    monkeypatch.setattr(webapp_lesson_attachments, "read_lesson_attachment_file", fake_read_lesson_attachment_file)

    response = await webapp_lesson_attachments.download_lesson_attachment(
        lesson.id,
        attachment.id,
        session,
        current_user,
    )

    assert response.status_code == 200
    assert response.body == b"pdf-bytes"
    assert read_kwargs["tenant_id"] == course.tenant_id
    assert read_kwargs["lesson_id"] == lesson.id
    assert "guide.pdf" in response.headers["content-disposition"]


@pytest.mark.asyncio
async def test_webapp_lesson_payload_includes_unlocked_attachments(monkeypatch):
    course, module, lesson, attachment = lesson_context()
    session = FakeSession([course, module, lesson], [FakeResult(first_value=None)])
    current_user = User(id=uuid.uuid4(), telegram_id=123)

    async def fake_get_lesson_access_state(**_kwargs):
        return FakeAccess(course=course, module=module, is_locked=False)

    async def fake_list_lesson_attachments(**_kwargs):
        return [attachment]

    async def fake_get_next_lesson_id(*_args):
        return None

    monkeypatch.setattr(webapp_lessons, "get_lesson_access_state", fake_get_lesson_access_state)
    monkeypatch.setattr(webapp_lessons, "list_lesson_attachments", fake_list_lesson_attachments)
    monkeypatch.setattr(webapp_lessons, "_get_next_lesson_id", fake_get_next_lesson_id)

    response = await webapp_lessons.get_lesson_view(str(lesson.id), session, current_user)

    assert response["lesson"]["attachments"] == [
        {
            "id": str(attachment.id),
            "tenant_id": str(attachment.tenant_id),
            "lesson_id": str(attachment.lesson_id),
            "filename": attachment.filename,
            "content_type": attachment.content_type,
            "size_bytes": attachment.size_bytes,
            "display_order": attachment.display_order,
            "created_at": attachment.created_at.isoformat(),
        }
    ]
