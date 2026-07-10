import uuid
from datetime import datetime

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from pydantic import ValidationError

from app.db import get_session
from app.models import User
from app.models_generation import (
    CourseStructureGenerationJob,
    CourseStructureLessonTask,
    CourseStructureLessonTaskStatus,
    LessonGenerationJobStatus,
)
from app.routes import course_structure_generation
from app.routes.auth import get_current_user
from app.schemas.lesson_generation import (
    CourseStructureGenerationCreate,
    CourseStructureGenerationJobRead,
)
from app.services.lesson_generation.course_structure_resume import ResumeResult


class FakeResult:
    def __init__(self, items):
        self.items = items

    def all(self):
        return list(self.items)


class FakeSession:
    def __init__(self, job, tasks=None):
        self.job = job
        self.tasks = tasks or []
        self.commits = 0
        self.refreshed = []

    async def get(self, model, item_id):
        if model is CourseStructureGenerationJob and item_id == self.job.id:
            return self.job
        return None

    async def exec(self, _statement):
        return FakeResult(self.tasks)

    async def commit(self):
        self.commits += 1

    async def refresh(self, item):
        self.refreshed.append(item)

    async def rollback(self):
        return None


def _job(**overrides):
    values = {
        "tenant_id": uuid.uuid4(),
        "course_id": uuid.uuid4(),
        "created_by_user_id": uuid.uuid4(),
        "notebook_url": "notebook:test",
        "status": LessonGenerationJobStatus.partial_drafts,
        "current_stage": "lessons",
        "planned_lesson_count": 4,
        "ready_lesson_count": 2,
        "failed_lesson_count": 1,
        "source_gap_lesson_count": 1,
        "resume_count": 2,
        "heartbeat_at": datetime(2026, 7, 10, 12, 0, 0),
    }
    values.update(overrides)
    return CourseStructureGenerationJob(**values)


def _client(monkeypatch, session):
    user = User(id=uuid.uuid4(), username="admin")
    app = FastAPI()
    app.include_router(course_structure_generation.router, prefix="/courses")

    async def override_session():
        return session

    async def override_user():
        return user

    async def allow_tenant(*_args, **_kwargs):
        return None

    app.dependency_overrides[get_session] = override_session
    app.dependency_overrides[get_current_user] = override_user
    monkeypatch.setattr(course_structure_generation, "ensure_tenant_access", allow_tenant)
    return TestClient(app)


def test_course_structure_create_normalizes_idempotency_key():
    request = CourseStructureGenerationCreate.model_validate(
        {"source_url": "https://example.com/source", "idempotency_key": "  course-v1  "}
    )

    assert request.idempotency_key == "course-v1"

    with pytest.raises(ValidationError):
        CourseStructureGenerationCreate.model_validate(
            {"source_url": "https://example.com/source", "idempotency_key": "   "}
        )


def test_course_structure_job_read_exposes_progress_and_resume_state():
    payload = CourseStructureGenerationJobRead.model_validate(_job())

    assert payload.progress == 50
    assert payload.can_resume is True
    assert payload.current_stage == "lessons"
    assert payload.resume_count == 2


def test_resume_course_structure_job_returns_updated_job(monkeypatch):
    job = _job()
    session = FakeSession(job)
    client = _client(monkeypatch, session)

    async def fake_resume(_session, resumed_job, *, include_source_gaps):
        assert _session is session
        assert resumed_job is job
        assert include_source_gaps is True
        resumed_job.status = LessonGenerationJobStatus.queued
        resumed_job.resume_count += 1
        return ResumeResult(resumed_task_count=2, included_source_gaps=True)

    monkeypatch.setattr(course_structure_generation, "resume_course_structure_job", fake_resume)

    response = client.post(
        f"/courses/structure-generation-jobs/{job.id}/resume",
        json={"include_source_gaps": True},
    )

    assert response.status_code == 200
    assert response.json()["status"] == "queued"
    assert response.json()["resumed_task_count"] == 2
    assert response.json()["included_source_gaps"] is True
    assert session.commits == 1
    assert session.refreshed == [job]


def test_list_course_structure_lessons_returns_lightweight_tasks(monkeypatch):
    job = _job()
    task = CourseStructureLessonTask(
        job_id=job.id,
        module_index=1,
        lesson_index=2,
        order_index=5,
        lesson_title="Практика",
        status=CourseStructureLessonTaskStatus.failed,
        source_pack_json={"private": "source evidence"},
        lesson_payload_json={"html": "private draft"},
        audit_json={"private": "review"},
        error="Generation failed",
        attempt_count=2,
    )
    client = _client(monkeypatch, FakeSession(job, [task]))

    response = client.get(f"/courses/structure-generation-jobs/{job.id}/lessons")

    assert response.status_code == 200
    body = response.json()[0]
    assert body["lesson_title"] == "Практика"
    assert body["module_index"] == 1
    assert body["lesson_index"] == 2
    assert body["attempt_count"] == 2
    assert "source_pack_json" not in body
    assert "lesson_payload_json" not in body
    assert "audit_json" not in body
