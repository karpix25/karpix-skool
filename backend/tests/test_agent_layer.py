import uuid

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.db import get_session
from app.models import Course, Lesson, Module, User
from app.models_agent import (
    AgentApproval,
    AgentApprovalStatus,
    AgentArtifact,
    AgentArtifactType,
    AgentRun,
)
from app.models_generation import CourseStructureGenerationJob, LessonGenerationJobStatus
from app.routes import agent as agent_route
from app.routes.auth import get_current_user
from app.schemas.agent import AgentRunCreate
from app.services.agent import create_agent_run
from app.services.agent import runs as agent_runs


class FakeResult:
    def __init__(self, items):
        self.items = list(items)

    def all(self):
        return self.items


class FakeSession:
    def __init__(self):
        self._objects = {}
        self.added = []
        self.commits = 0
        self.refreshed = []
        self.flushes = 0

    async def get(self, model, item_id):
        return self._objects.get((model, item_id))

    async def exec(self, stmt):
        entity = stmt.column_descriptions[0]["entity"]
        items = [item for (model, _item_id), item in self._objects.items() if model is entity]
        if hasattr(entity, "run_id"):
            items = [item for item in items if item.run_id in self._run_ids()]
        return FakeResult(items)

    def add(self, item):
        self.added.append(item)
        if hasattr(item, "id"):
            self._objects[(type(item), item.id)] = item

    async def commit(self):
        self.commits += 1

    async def refresh(self, item):
        self.refreshed.append(item)

    async def flush(self):
        self.flushes += 1

    def _run_ids(self):
        return {item.id for (model, _item_id), item in self._objects.items() if model is AgentRun}


def _user() -> User:
    return User(id=uuid.uuid4(), username="manager")


def _request(**overrides) -> AgentRunCreate:
    payload = {
        "tenant_id": uuid.uuid4(),
        "course_title": "Draft Course",
        "description": "Draft description",
        "module_count": 3,
        "lessons_per_module": 2,
        "style": "practical",
        "audience_level": "beginner",
    }
    payload.update(overrides)
    return AgentRunCreate.model_validate(payload)


def _artifacts(session):
    return [item for item in session.added if isinstance(item, AgentArtifact)]


def _courses(session):
    return [item for item in session.added if isinstance(item, Course)]


def _modules(session):
    return [item for item in session.added if isinstance(item, Module)]


def _lessons(session):
    return [item for item in session.added if isinstance(item, Lesson)]


def _jobs(session):
    return [item for item in session.added if isinstance(item, CourseStructureGenerationJob)]


@pytest.mark.asyncio
async def test_agent_run_creates_unpublished_course_and_draft_approval(monkeypatch):
    session = FakeSession()
    user = _user()
    invalidations = []

    async def fake_invalidate_course_write_caches(**kwargs):
        invalidations.append(kwargs)

    monkeypatch.setattr(agent_runs, "invalidate_course_write_caches", fake_invalidate_course_write_caches)

    response = await create_agent_run(session=session, current_user=user, request=_request())

    course = _courses(session)[0]
    approval = next(item for item in session.added if isinstance(item, AgentApproval))
    assert response.status == "draft_created"
    assert response.approval_status == AgentApprovalStatus.pending
    assert course.title == "Draft Course"
    assert course.is_published is False
    assert course.is_vip is False
    assert approval.status == AgentApprovalStatus.pending
    assert approval.request_json == {"course_id": str(course.id), "publish": False}
    assert _jobs(session) == []
    assert [artifact.artifact_type for artifact in _artifacts(session)] == [AgentArtifactType.course]
    assert invalidations == [{"course_id": course.id, "tenant_id": course.tenant_id}]


@pytest.mark.asyncio
async def test_agent_run_creates_unpublished_modules_lessons_and_media_artifacts(monkeypatch):
    session = FakeSession()
    user = _user()
    invalidations = []

    async def fake_invalidate_course_write_caches(**kwargs):
        invalidations.append(kwargs)

    monkeypatch.setattr(agent_runs, "invalidate_course_write_caches", fake_invalidate_course_write_caches)

    response = await create_agent_run(
        session=session,
        current_user=user,
        request=_request(
            cover_url="https://cdn.example.com/course.png",
            is_vip=True,
            modules=[
                {
                    "title": " Module One ",
                    "lessons": [
                        {
                            "title": " Lesson One ",
                            "content": '<p onclick="bad()">Hi<img src="https://cdn.example.com/a.png"></p><script>bad()</script>',
                            "cover_url": "https://cdn.example.com/lesson.png",
                        }
                    ],
                }
            ],
        ),
    )

    course = _courses(session)[0]
    module = _modules(session)[0]
    lesson = _lessons(session)[0]
    artifact_types = [artifact.artifact_type for artifact in _artifacts(session)]
    assert course.is_published is False
    assert course.cover_url == "https://cdn.example.com/course.png"
    assert course.is_vip is True
    assert module.title == "Module One"
    assert module.is_vip is True
    assert lesson.title == "Lesson One"
    assert lesson.is_published is False
    assert lesson.is_vip is True
    assert lesson.content == '<p>Hi<img src="https://cdn.example.com/a.png"></p>'
    assert lesson.cover_url == "https://cdn.example.com/lesson.png"
    assert response.steps[0].output_json["module_count"] == 1
    assert response.steps[0].output_json["lesson_count"] == 1
    assert artifact_types == [
        AgentArtifactType.course,
        AgentArtifactType.media,
        AgentArtifactType.module,
        AgentArtifactType.lesson,
        AgentArtifactType.media,
    ]
    assert invalidations == [{"course_id": course.id, "tenant_id": course.tenant_id}]


@pytest.mark.asyncio
async def test_agent_run_with_notebook_queues_structure_job_and_writes_artifacts(monkeypatch):
    session = FakeSession()
    user = _user()
    invalidations = []

    async def fake_invalidate_course_write_caches(**kwargs):
        invalidations.append(kwargs)

    monkeypatch.setattr(agent_runs, "invalidate_course_write_caches", fake_invalidate_course_write_caches)

    response = await create_agent_run(
        session=session,
        current_user=user,
        request=_request(source_url="https://example.com/notebook/example"),
    )

    course = _courses(session)[0]
    job = _jobs(session)[0]
    artifact_types = [artifact.artifact_type for artifact in _artifacts(session)]
    assert course.is_published is False
    assert job.status == LessonGenerationJobStatus.queued
    assert job.course_id == course.id
    assert job.module_count == 3
    assert job.lessons_per_module == 2
    assert response.steps[0].output_json == {
        "course_id": str(course.id),
        "module_count": 0,
        "lesson_count": 0,
        "course_structure_generation_job_id": str(job.id),
    }
    assert artifact_types == [
        AgentArtifactType.course,
        AgentArtifactType.course_structure_generation_job,
    ]
    assert session.commits == 1
    assert invalidations == [{"course_id": course.id, "tenant_id": course.tenant_id}]


@pytest.mark.asyncio
async def test_agent_run_with_sources_queues_structure_job_with_all_sources(monkeypatch):
    session = FakeSession()
    user = _user()
    invalidations = []

    async def fake_invalidate_course_write_caches(**kwargs):
        invalidations.append(kwargs)

    monkeypatch.setattr(agent_runs, "invalidate_course_write_caches", fake_invalidate_course_write_caches)

    response = await create_agent_run(
        session=session,
        current_user=user,
        request=_request(
            sources=[
                {
                    "kind": "note",
                    "title": "Admin notes",
                    "content": "Use direct language and practical examples.",
                },
                {
                    "kind": "youtube",
                    "title": "Source video",
                    "url": "https://youtube.com/watch?v=abc123",
                },
            ],
        ),
    )

    job = _jobs(session)[0]
    job_artifact = next(
        artifact
        for artifact in _artifacts(session)
        if artifact.artifact_type == AgentArtifactType.course_structure_generation_job
    )
    assert job.status == LessonGenerationJobStatus.queued
    assert job.notebook_url == "https://youtube.com/watch?v=abc123"
    assert job.request_json["sources"] == [
        {
            "kind": "note",
            "title": "Admin notes",
            "url": None,
            "content": "Use direct language and practical examples.",
            "content_type": None,
            "size_bytes": None,
        },
        {
            "kind": "youtube",
            "title": "Source video",
            "url": "https://youtube.com/watch?v=abc123",
            "content": None,
            "content_type": None,
            "size_bytes": None,
        },
    ]
    assert response.steps[0].output_json["course_structure_generation_job_id"] == str(job.id)
    assert job_artifact.payload_json["source_count"] == 2
    assert invalidations == [{"course_id": _courses(session)[0].id, "tenant_id": _courses(session)[0].tenant_id}]


def test_agent_routes_create_and_read_run_with_existing_auth_hooks(monkeypatch):
    session = FakeSession()
    user = _user()
    app = FastAPI()
    app.include_router(agent_route.router, prefix="/agent")
    access_checks = []

    async def allow_tenant_access(tenant_id, current_user, db_session):
        access_checks.append((tenant_id, current_user.id, db_session))

    async def fake_invalidate_course_write_caches(**_kwargs):
        return None

    async def override_session():
        return session

    async def override_user():
        return user

    app.dependency_overrides[get_session] = override_session
    app.dependency_overrides[get_current_user] = override_user
    monkeypatch.setattr(agent_route, "ensure_tenant_access", allow_tenant_access)
    monkeypatch.setattr(agent_runs, "invalidate_course_write_caches", fake_invalidate_course_write_caches)

    tenant_id = uuid.uuid4()
    client = TestClient(app)
    create_response = client.post(
        "/agent/runs",
        json={
            "task_type": "create_course_draft",
            "tenant_id": str(tenant_id),
            "course_title": "Route Draft",
            "description": "Route description",
            "source_url": "https://example.com/notebook/example",
            "module_count": 2,
            "lessons_per_module": 2,
        },
    )

    assert create_response.status_code == 201
    body = create_response.json()
    assert body["status"] == "draft_created"
    assert body["approvals"][0]["status"] == "pending"
    assert body["artifacts"][0]["resource_type"] == "course"
    assert body["artifacts"][1]["resource_type"] == "course_structure_generation_job"
    assert _courses(session)[0].is_published is False

    read_response = client.get(f"/agent/runs/{body['id']}")

    assert read_response.status_code == 200
    assert read_response.json()["id"] == body["id"]
    assert [check[0] for check in access_checks] == [tenant_id, tenant_id]
