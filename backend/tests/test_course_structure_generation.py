import uuid

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from pydantic import ValidationError

from app.db import get_session
from app.models import Course, Lesson, Module, User
from app.models_generation import (
    CourseStructureGenerationJob,
    GeneratedCourseModuleDraft,
    LessonGenerationJobStatus,
)
from app.routes import course_structure_generation
from app.routes.auth import get_current_user
from app.schemas.lesson_generation import (
    CourseStructureGenerationCreate,
    GeneratedCourseModulePayload,
    GeneratedCourseStructurePayload,
    GeneratedLessonPayload,
)
from app.services.lesson_generation import course_structure_jobs, course_structure_publisher
from app.services.lesson_generation.parser import LessonGenerationParseError, parse_generated_course_structure
from app.services.lesson_generation.prompts import build_source_course_structure_prompt


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
        self.flushes = 0

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
        self.flushes += 1


def test_course_structure_create_accepts_source_url():
    request = CourseStructureGenerationCreate.model_validate(
        {
            "source_url": " https://example.com/notebook/example ",
            "module_count": 3,
            "lessons_per_module": 2,
        }
    )

    assert request.notebook_url == "https://example.com/notebook/example"
    assert request.module_count == 3
    assert request.lessons_per_module == 2


def test_course_structure_create_accepts_course_quality_brief():
    request = CourseStructureGenerationCreate.model_validate(
        {
            "source_url": "https://example.com/material",
            "course_goal": "Научить запускать AI-агентов в бизнес-процессе",
            "target_audience": "Основатели и операционные менеджеры",
            "lesson_format": "Проблема, пример, задание",
            "depth": "Практично и подробно",
            "practice_level": "Задание в каждом уроке",
            "media_strategy": "Планировать скриншоты интерфейса",
            "monetization_strategy": "Первый модуль free, продвинутые кейсы VIP",
        }
    )

    assert request.course_goal == "Научить запускать AI-агентов в бизнес-процессе"
    assert request.target_audience == "Основатели и операционные менеджеры"


def test_course_structure_prompt_uses_quality_brief_and_methodology():
    job = CourseStructureGenerationJob(
        tenant_id=uuid.uuid4(),
        course_id=uuid.uuid4(),
        created_by_user_id=uuid.uuid4(),
        notebook_url="https://example.com/material",
        module_count=3,
        lessons_per_module=2,
        audience_level="Новичок",
        style="Живой текст без воды",
        request_json={
            "course_goal": "Научить запускать AI-агентов в бизнес-процессе",
            "target_audience": "Основатели",
            "lesson_format": "Проблема, пример, задание",
            "media_strategy": "Ставить места для схем",
        },
    )

    prompt = build_source_course_structure_prompt(job, "AI agents")

    assert "transformation" in prompt
    assert "backward design" in prompt
    assert "Merrill" in prompt
    assert "Научить запускать AI-агентов" in prompt
    assert '"media_plan"' in prompt


def test_course_structure_create_rejects_non_http_source_url():
    with pytest.raises(ValidationError):
        CourseStructureGenerationCreate.model_validate({"source_url": "ftp://example.com/notebook/example"})


def test_parse_generated_course_structure_extracts_json_and_clamps_counts():
    generated = parse_generated_course_structure(
        """
        ```json
        {
          "modules": [
            {
              "title": "One",
              "lessons": [
                {"title": "A", "html": "<h2>A</h2><p>Text</p>"},
                {"title": "B", "html": "<h2>B</h2><p>Text</p>"}
              ]
            },
            {
              "title": "Two",
              "lessons": [{"title": "C", "html": "<h2>C</h2><p>Text</p>"}]
            }
          ]
        }
        ```
        """,
        max_modules=1,
        max_lessons_per_module=1,
    )

    assert [module.title for module in generated.modules] == ["One"]
    assert [lesson.title for lesson in generated.modules[0].lessons] == ["A"]


def test_parse_generated_course_structure_rejects_missing_json():
    with pytest.raises(LessonGenerationParseError):
        parse_generated_course_structure("No JSON here", max_modules=4, max_lessons_per_module=4)


def test_parse_generated_course_structure_allows_raw_newlines_inside_html_string():
    generated = parse_generated_course_structure(
        '{ "modules": [ { "title": "One", "lessons": [ { "title": "A", '
        '"html": "<p>Text from Open Notebook\n1\n.</p>" } ] } ] }',
        max_modules=4,
        max_lessons_per_module=4,
    )

    assert generated.modules[0].lessons[0].html == "<p>Text from Open Notebook\n1\n.</p>"


@pytest.mark.asyncio
async def test_process_course_structure_job_marks_unanswerable_source_and_stores_raw_response(monkeypatch):
    course = Course(id=uuid.uuid4(), tenant_id=uuid.uuid4(), title="Course", open_notebook_id="notebook:course")
    job = CourseStructureGenerationJob(
        tenant_id=course.tenant_id,
        course_id=course.id,
        created_by_user_id=uuid.uuid4(),
        notebook_url="https://example.com/notebook/example",
        module_count=2,
        lessons_per_module=2,
        status=LessonGenerationJobStatus.running,
    )
    session = FakeSession([course, job])
    source_response = {"answer": "Я пока не могу вам ответить.", "source_format": "json"}

    class FakeLessonGenerationProvider:
        async def ask_from_sources(self, *, sources, question, notebook_id=None):
            assert notebook_id == "notebook:course"
            return source_response

    monkeypatch.setattr(course_structure_jobs, "async_session_maker", lambda: session)
    monkeypatch.setattr(
        course_structure_jobs,
        "create_lesson_generation_provider",
        lambda: FakeLessonGenerationProvider(),
    )

    await course_structure_jobs.process_course_structure_generation_job(job.id)

    assert job.status == LessonGenerationJobStatus.invalid_notebook
    assert "Open Notebook не смог" in job.error
    assert job.response_json == {
        "parse_error": job.error,
        "source_answer": source_response,
        "notebook_answer": source_response,
    }
    assert session.commits == 1


@pytest.mark.asyncio
async def test_process_course_structure_job_persists_created_course_notebook_on_parse_error(monkeypatch):
    course = Course(id=uuid.uuid4(), tenant_id=uuid.uuid4(), title="Course")
    job = CourseStructureGenerationJob(
        tenant_id=course.tenant_id,
        course_id=course.id,
        created_by_user_id=uuid.uuid4(),
        notebook_url="https://example.com/notebook/example",
        module_count=2,
        lessons_per_module=2,
        status=LessonGenerationJobStatus.running,
    )
    session = FakeSession([course, job])
    source_response = {
        "answer": "Open Notebook did not follow the contract",
        "notebook_id": "notebook:new",
    }

    class FakeLessonGenerationProvider:
        async def ask_from_sources(self, *, sources, question, notebook_id=None):
            assert notebook_id is None
            return source_response

    monkeypatch.setattr(course_structure_jobs, "async_session_maker", lambda: session)
    monkeypatch.setattr(
        course_structure_jobs,
        "create_lesson_generation_provider",
        lambda: FakeLessonGenerationProvider(),
    )

    await course_structure_jobs.process_course_structure_generation_job(job.id)

    assert course.open_notebook_id == "notebook:new"
    assert job.status == LessonGenerationJobStatus.invalid_output
    assert job.response_json["source_answer"] == source_response


@pytest.mark.asyncio
async def test_create_draft_modules_and_lessons_saves_unpublished_sanitized_content(monkeypatch):
    course = Course(id=uuid.uuid4(), tenant_id=uuid.uuid4(), title="Course", is_vip=True)
    job = CourseStructureGenerationJob(
        tenant_id=course.tenant_id,
        course_id=course.id,
        created_by_user_id=uuid.uuid4(),
        notebook_url="https://example.com/notebook/example",
        module_count=2,
        lessons_per_module=2,
    )
    existing_module = Module(id=uuid.uuid4(), course_id=course.id, title="Existing", order_index=2)
    session = FakeSession(exec_results=[[existing_module]])
    invalidated = []

    async def fake_invalidate_course_write_caches(**kwargs):
        invalidated.append(kwargs)

    monkeypatch.setattr(
        course_structure_publisher,
        "invalidate_course_write_caches",
        fake_invalidate_course_write_caches,
    )

    created = await course_structure_publisher.create_draft_modules_and_lessons_from_generation(
        session=session,
        job=job,
        course=course,
        generated=GeneratedCourseStructurePayload(
            modules=[
                GeneratedCourseModulePayload(
                    title=" Basics ",
                    lessons=[
                        GeneratedLessonPayload(title=" One ", html='<p onclick="bad()">Hi</p>'),
                        GeneratedLessonPayload(title="Two", html="<script>bad()</script><p>Ok</p>"),
                    ],
                )
            ]
        ),
    )

    lessons = [item for item in session.added if isinstance(item, Lesson)]
    mappings = [item for item in session.added if isinstance(item, GeneratedCourseModuleDraft)]
    assert [module.order_index for module in created] == [3]
    assert created[0].title == "Basics"
    assert [lesson.is_published for lesson in lessons] == [False, False]
    assert [lesson.is_vip for lesson in lessons] == [True, True]
    assert lessons[0].content == "<p>Hi</p>"
    assert lessons[1].content == "<p>Ok</p>"
    assert len(mappings) == 1
    assert job.created_module_count == 1
    assert job.created_lesson_count == 2
    assert session.flushes == 1
    assert session.commits == 1
    assert invalidated == [{"course_id": course.id, "tenant_id": course.tenant_id}]


def test_course_structure_generation_routes_create_and_read_job(monkeypatch):
    course = Course(id=uuid.uuid4(), tenant_id=uuid.uuid4(), title="Course")
    user = User(id=uuid.uuid4(), username="admin")
    session = FakeSession([course])
    app = FastAPI()
    app.include_router(course_structure_generation.router, prefix="/courses")

    async def override_session():
        return session

    async def override_user():
        return user

    async def override_managed_course():
        return course

    async def fake_ensure_tenant_access(*_args, **_kwargs):
        return None

    app.dependency_overrides[get_session] = override_session
    app.dependency_overrides[get_current_user] = override_user
    app.dependency_overrides[course_structure_generation.get_managed_course] = override_managed_course
    monkeypatch.setattr(course_structure_generation, "ensure_tenant_access", fake_ensure_tenant_access)

    client = TestClient(app)
    response = client.post(
        f"/courses/{course.id}/structure-generation-jobs",
        json={
            "source_url": "https://example.com/notebook/example",
            "module_count": 3,
            "lessons_per_module": 2,
        },
    )

    assert response.status_code == 201
    body = response.json()
    assert body["status"] == LessonGenerationJobStatus.queued
    assert body["course_id"] == str(course.id)
    assert body["created_by_user_id"] == str(user.id)
    assert body["created_module_count"] == 0

    status_response = client.get(f"/courses/structure-generation-jobs/{body['id']}")

    assert status_response.status_code == 200
    assert status_response.json()["id"] == body["id"]
