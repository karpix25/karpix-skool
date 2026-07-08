import uuid

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from pydantic import ValidationError

from app.db import get_session
from app.models import Course, Lesson, Module, User
from app.models_generation import GeneratedLessonDraft, LessonGenerationJob, LessonGenerationJobStatus
from app.routes import lesson_generation
from app.routes.auth import get_current_user
from app.schemas.lesson_generation import (
    GeneratedLessonPayload,
    GeneratedLessonsPayload,
    LessonGenerationCreate,
)
from app.services.lesson_generation import jobs, publisher
from app.services.lesson_generation.jobs import _notebook_client_error_status
from app.services.lesson_generation.parser import (
    GenerationUnanswerableError,
    LessonGenerationParseError,
    parse_generated_lessons,
)
from app.services.lesson_generation.prompts import build_source_lesson_prompt
from app.services.lesson_generation.provider import LessonGenerationClientError


class FakeResult:
    def __init__(self, items):
        self.items = list(items)

    def first(self):
        return self.items[0] if self.items else None


class FakeSession:
    def __init__(self, objects=None, exec_results=None):
        self._objects = {(type(item), item.id): item for item in objects or []}
        self.exec_results = list(exec_results or [])
        self.added = []
        self.commits = 0
        self.refreshed = []
        self.flushed = False

    async def __aenter__(self):
        return self

    async def __aexit__(self, *_args):
        return False

    async def get(self, model, item_id):
        return self._objects.get((model, item_id))

    async def exec(self, _stmt):
        items = self.exec_results.pop(0) if self.exec_results else []
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
        self.flushed = True


def test_lesson_generation_create_accepts_source_url():
    request = LessonGenerationCreate.model_validate(
        {
            "source_url": " https://example.com/notebook/example ",
            "lesson_count": 3,
        }
    )

    assert request.notebook_url == "https://example.com/notebook/example"
    assert request.lesson_count == 3


def test_lesson_generation_create_accepts_inline_sources_without_legacy_url():
    request = LessonGenerationCreate.model_validate(
        {
            "sources": [
                {
                    "kind": "note",
                    "title": "My notes",
                    "content": " Lesson ideas ",
                }
            ],
            "lesson_count": 2,
        }
    )

    assert request.notebook_url is None
    assert request.sources[0].content == "Lesson ideas"
    assert request.lesson_count == 2


def test_lesson_generation_create_accepts_course_quality_brief():
    request = LessonGenerationCreate.model_validate(
        {
            "source_url": "https://example.com/material",
            "lesson_count": 2,
            "course_goal": "Научить собирать AI-воркфлоу",
            "target_audience": "Продакт-менеджеры",
            "lesson_format": "Проблема, демонстрация, практика",
            "depth": "Средняя глубина",
            "practice_level": "Практическое задание в каждом уроке",
            "media_strategy": "Добавлять места для схем",
            "monetization_strategy": "Продвинутые практики оставить для VIP",
        }
    )

    assert request.course_goal == "Научить собирать AI-воркфлоу"
    assert request.media_strategy == "Добавлять места для схем"


def test_lesson_prompt_uses_quality_brief_and_media_plan_contract():
    job = LessonGenerationJob(
        tenant_id=uuid.uuid4(),
        course_id=uuid.uuid4(),
        module_id=uuid.uuid4(),
        created_by_user_id=uuid.uuid4(),
        notebook_url="https://example.com/material",
        lesson_count=2,
        audience_level="Средний",
        style="Человечно и конкретно",
        request_json={
            "course_goal": "Научить собирать AI-воркфлоу",
            "target_audience": "Продакт-менеджеры",
            "practice_level": "Практика в каждом уроке",
        },
    )

    prompt = build_source_lesson_prompt(job, "Автоматизация")

    assert "Merrill" in prompt
    assert "Научить собирать AI-воркфлоу" in prompt
    assert "Продакт-менеджеры" in prompt
    assert '"media_plan"' in prompt


def test_lesson_generation_create_rejects_non_http_source_url():
    with pytest.raises(ValidationError):
        LessonGenerationCreate.model_validate({"source_url": "ftp://example.com/notebook/example"})


def test_parse_generated_lessons_extracts_json_and_clamps_count():
    generated = parse_generated_lessons(
        """
        ```json
        {
          "lessons": [
            {"title": "One", "html": "<h2>One</h2><p>Text</p>"},
            {"title": "Two", "html": "<h2>Two</h2><p>Text</p>"}
          ]
        }
        ```
        """,
        max_lessons=1,
    )

    assert [lesson.title for lesson in generated.lessons] == ["One"]


def test_parse_generated_lessons_rejects_missing_json():
    with pytest.raises(LessonGenerationParseError):
        parse_generated_lessons("Open Notebook did not follow the contract", max_lessons=5)


def test_parse_generated_lessons_rejects_unanswerable_source_message():
    with pytest.raises(GenerationUnanswerableError) as exc_info:
        parse_generated_lessons("Я пока не могу вам ответить.", max_lessons=5)

    assert "Open Notebook не смог" in str(exc_info.value)


def test_notebook_client_error_status_does_not_treat_all_client_errors_as_bad_links():
	assert (
	    _notebook_client_error_status(LessonGenerationClientError("Open Notebook API HTTP 500"))
	    == LessonGenerationJobStatus.failed
	)
	assert (
	    _notebook_client_error_status(LessonGenerationClientError("source not found"))
	    == LessonGenerationJobStatus.invalid_notebook
	)


@pytest.mark.asyncio
async def test_process_lesson_job_marks_unanswerable_source_and_stores_raw_response(monkeypatch):
    course = Course(id=uuid.uuid4(), tenant_id=uuid.uuid4(), title="Course")
    module = Module(id=uuid.uuid4(), course_id=course.id, title="Module")
    job = LessonGenerationJob(
        tenant_id=course.tenant_id,
        course_id=course.id,
        module_id=module.id,
        created_by_user_id=uuid.uuid4(),
        notebook_url="https://example.com/notebook/example",
        lesson_count=2,
        status=LessonGenerationJobStatus.running,
    )
    session = FakeSession([course, module, job])
    source_response = {"answer": "Я пока не могу вам ответить.", "source_format": "json"}

    class FakeLessonGenerationProvider:
        async def ask_from_sources(self, *, sources, question):
            assert sources[0].url == "https://example.com/notebook/example"
            return source_response

        async def ask_lessons(self, *, source_url, question):
            return source_response

    monkeypatch.setattr(jobs, "async_session_maker", lambda: session)
    monkeypatch.setattr(jobs, "create_lesson_generation_provider", lambda: FakeLessonGenerationProvider())

    await jobs.process_lesson_generation_job(job.id)

    assert job.status == LessonGenerationJobStatus.invalid_notebook
    assert "Open Notebook не смог" in job.error
    assert job.response_json == {
        "parse_error": job.error,
        "source_answer": source_response,
        "notebook_answer": source_response,
    }
    assert session.commits == 1


@pytest.mark.asyncio
async def test_create_draft_lessons_saves_unpublished_sanitized_lessons(monkeypatch):
    course = Course(id=uuid.uuid4(), tenant_id=uuid.uuid4(), title="Course")
    module = Module(id=uuid.uuid4(), course_id=course.id, title="Module", is_vip=True)
    job = LessonGenerationJob(
        tenant_id=course.tenant_id,
        course_id=course.id,
        module_id=module.id,
        created_by_user_id=uuid.uuid4(),
        notebook_url="https://example.com/notebook/example",
    )
    existing_lesson = Lesson(id=uuid.uuid4(), module_id=module.id, title="Existing", order_index=4)
    session = FakeSession(exec_results=[[existing_lesson]])
    invalidated = []

    async def fake_invalidate_course_write_caches(**kwargs):
        invalidated.append(kwargs)

    monkeypatch.setattr(publisher, "invalidate_course_write_caches", fake_invalidate_course_write_caches)

    created = await publisher.create_draft_lessons_from_generation(
        session=session,
        job=job,
        module=module,
        course=course,
        generated=GeneratedLessonsPayload(
            lessons=[
                GeneratedLessonPayload(title=" One ", html='<p onclick="bad()">Hi</p>'),
                GeneratedLessonPayload(title="Two", html="<script>bad()</script><p>Ok</p>"),
            ]
        ),
    )

    mappings = [item for item in session.added if isinstance(item, GeneratedLessonDraft)]
    assert [lesson.order_index for lesson in created] == [5, 6]
    assert [lesson.is_published for lesson in created] == [False, False]
    assert [lesson.is_vip for lesson in created] == [True, True]
    assert created[0].content == "<p>Hi</p>"
    assert created[1].content == "<p>Ok</p>"
    assert len(mappings) == 2
    assert job.created_lesson_count == 2
    assert job.completed_at is not None
    assert session.flushed is True
    assert session.commits == 1
    assert invalidated == [{"course_id": course.id, "tenant_id": course.tenant_id}]


def test_lesson_generation_routes_create_and_read_job(monkeypatch):
    course = Course(id=uuid.uuid4(), tenant_id=uuid.uuid4(), title="Course")
    module = Module(id=uuid.uuid4(), course_id=course.id, title="Module")
    user = User(id=uuid.uuid4(), username="admin")
    session = FakeSession([course, module])
    app = FastAPI()
    app.include_router(lesson_generation.router, prefix="/courses")

    async def override_session():
        return session

    async def override_user():
        return user

    async def override_managed_module():
        return module

    async def fake_ensure_tenant_access(*_args, **_kwargs):
        return None

    app.dependency_overrides[get_session] = override_session
    app.dependency_overrides[get_current_user] = override_user
    app.dependency_overrides[lesson_generation.get_managed_module] = override_managed_module
    monkeypatch.setattr(lesson_generation, "ensure_tenant_access", fake_ensure_tenant_access)

    client = TestClient(app)
    response = client.post(
        f"/courses/modules/{module.id}/lesson-generation-jobs",
        json={
            "source_url": "https://example.com/notebook/example",
            "lesson_count": 4,
        },
    )

    assert response.status_code == 201
    body = response.json()
    assert body["status"] == LessonGenerationJobStatus.queued
    assert body["module_id"] == str(module.id)
    assert body["created_by_user_id"] == str(user.id)
    assert body["created_lesson_count"] == 0

    status_response = client.get(f"/courses/lesson-generation-jobs/{body['id']}")

    assert status_response.status_code == 200
    assert status_response.json()["id"] == body["id"]
