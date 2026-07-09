import uuid

import pytest

from app.models import Course
from app.models_generation import CourseStructureGenerationJob, LessonGenerationJobStatus
from app.schemas.lesson_generation import (
    GeneratedCourseModulePayload,
    GeneratedCourseStructurePayload,
    GeneratedLessonPayload,
)
from app.services.lesson_generation import course_structure_jobs
from app.services.lesson_generation.course_structure_pipeline import CourseStructurePipelineError
from app.services.lesson_generation.course_structure_pipeline import CourseStructurePipelineResult
from app.services.lesson_generation.parser import LessonGenerationParseError


class FakeResult:
    def __init__(self, items):
        self.items = list(items)

    def first(self):
        return self.items[0] if self.items else None


class FakeSession:
    def __init__(self, objects=None):
        self._objects = {(type(item), item.id): item for item in objects or []}
        self.added = []
        self.commits = 0

    async def __aenter__(self):
        return self

    async def __aexit__(self, *_args):
        return False

    async def get(self, model, item_id):
        return self._objects.get((model, item_id))

    async def exec(self, _stmt):
        return FakeResult([])

    def add(self, item):
        self.added.append(item)
        if hasattr(item, "id"):
            self._objects[(type(item), item.id)] = item

    async def commit(self):
        self.commits += 1


def _open_notebook_job(course: Course) -> CourseStructureGenerationJob:
    return CourseStructureGenerationJob(
        tenant_id=course.tenant_id,
        course_id=course.id,
        created_by_user_id=uuid.uuid4(),
        notebook_url="notebook:course",
        module_count=2,
        lessons_per_module=2,
        status=LessonGenerationJobStatus.running,
        request_json={
            "sources": [
                {
                    "kind": "open_notebook",
                    "url": "https://notebook.karpix.com/notebooks/notebook%3Acourse",
                }
            ]
        },
    )


def _generated_course() -> GeneratedCourseStructurePayload:
    return GeneratedCourseStructurePayload(
        modules=[
            GeneratedCourseModulePayload(
                title="Ниши и оффер",
                lessons=[
                    GeneratedLessonPayload(title="Где деньги", html="<h2>Старт</h2><p>Текст</p>"),
                    GeneratedLessonPayload(title="Проверка спроса", html="<h2>Старт</h2><p>Текст</p>"),
                ],
            ),
            GeneratedCourseModulePayload(
                title="Первые продажи",
                lessons=[
                    GeneratedLessonPayload(title="Чат-оффер", html="<h2>Старт</h2><p>Текст</p>"),
                    GeneratedLessonPayload(title="Ручной запуск", html="<h2>Старт</h2><p>Текст</p>"),
                ],
            ),
        ]
    )


@pytest.mark.asyncio
async def test_process_course_structure_job_uses_staged_pipeline_and_publishes_complete_result(monkeypatch):
    course = Course(id=uuid.uuid4(), tenant_id=uuid.uuid4(), title="Деньги в ИИ", open_notebook_id="notebook:course")
    job = _open_notebook_job(course)
    session = FakeSession([course, job])
    source_response = {
        "answer": (
            "Главная трансформация: студент учится выбирать денежные AI-ниши. "
            "Темы: поиск спроса, упаковка оффера, простая автоматизация, первые продажи."
        ),
        "notebook_id": "notebook:course",
        "transformation_id": "transformation:brief",
        "model_id": "model:brief",
    }
    generated = _generated_course()
    published = []
    pipeline_calls = []

    class FakeLessonGenerationProvider:
        async def ask_from_sources(self, *, sources, question, notebook_id=None, transformation=None):
            assert notebook_id == "notebook:course"
            assert transformation.name == course_structure_jobs.SOURCE_BRIEF_TRANSFORMATION.name
            assert "Return plain text only" in question
            return source_response

    class FakeCourseStructurePipeline:
        async def generate(self, *, client, sources, notebook_id, source_brief, job, course_title):
            pipeline_calls.append(
                {
                    "client": client,
                    "sources": sources,
                    "notebook_id": notebook_id,
                    "source_brief": source_brief,
                    "job": job,
                    "course_title": course_title,
                }
            )
            return CourseStructurePipelineResult(
                generated=generated,
                response_json={
                    "pipeline": "source_brief_blueprint_lesson_source_packs",
                    "blueprint": {"modules": []},
                    "lesson_audits": [],
                },
            )

    async def fake_publish(**kwargs):
        published.append(kwargs)
        kwargs["job"].created_module_count = len(kwargs["generated"].modules)
        kwargs["job"].created_lesson_count = sum(len(module.lessons) for module in kwargs["generated"].modules)

    monkeypatch.setattr(course_structure_jobs, "async_session_maker", lambda: session)
    monkeypatch.setattr(course_structure_jobs, "create_lesson_generation_provider", lambda: FakeLessonGenerationProvider())
    monkeypatch.setattr(course_structure_jobs, "create_course_structure_pipeline", lambda: FakeCourseStructurePipeline())
    monkeypatch.setattr(course_structure_jobs, "create_draft_modules_and_lessons_from_generation", fake_publish)

    await course_structure_jobs.process_course_structure_generation_job(job.id)

    assert job.status == LessonGenerationJobStatus.drafts_created
    assert job.created_module_count == 2
    assert job.created_lesson_count == 4
    assert job.response_json["source_answer"] == source_response
    assert job.response_json["source_brief"]["answer"] == source_response["answer"]
    assert job.response_json["structured_output"]["pipeline"] == "source_brief_blueprint_lesson_source_packs"
    assert job.response_json["modules"][1]["title"] == "Первые продажи"
    assert published[0]["generated"] == generated
    assert pipeline_calls[0]["source_brief"] == source_response["answer"]
    assert pipeline_calls[0]["notebook_id"] == "notebook:course"


@pytest.mark.asyncio
async def test_process_course_structure_job_preserves_source_brief_when_staged_pipeline_fails(monkeypatch):
    course = Course(id=uuid.uuid4(), tenant_id=uuid.uuid4(), title="Деньги в ИИ", open_notebook_id="notebook:course")
    job = _open_notebook_job(course)
    session = FakeSession([course, job])
    source_response = {
        "answer": (
            "Главная трансформация: студент учится находить деньги в AI-услугах. "
            "Темы: выбор ниши, быстрый прототип, продажа результата бизнесу."
        ),
        "notebook_id": "notebook:course",
    }
    published = []

    class FakeLessonGenerationProvider:
        async def ask_from_sources(self, *, sources, question, notebook_id=None, transformation=None):
            return source_response

    class FakeCourseStructurePipeline:
        async def generate(self, *, client, sources, notebook_id, source_brief, job, course_title):
            raise CourseStructurePipelineError(
                "Expected up to 2 blueprint modules, got 3",
                response_json={
                    "pipeline": "source_brief_blueprint_lesson_source_packs",
                    "failed_stage": "blueprint",
                    "error": "Expected up to 2 blueprint modules, got 3",
                    "blueprint_generation": {"attempt_errors": []},
                },
            )

    async def fake_publish(**kwargs):
        published.append(kwargs)

    monkeypatch.setattr(course_structure_jobs, "async_session_maker", lambda: session)
    monkeypatch.setattr(course_structure_jobs, "create_lesson_generation_provider", lambda: FakeLessonGenerationProvider())
    monkeypatch.setattr(course_structure_jobs, "create_course_structure_pipeline", lambda: FakeCourseStructurePipeline())
    monkeypatch.setattr(course_structure_jobs, "create_draft_modules_and_lessons_from_generation", fake_publish)

    await course_structure_jobs.process_course_structure_generation_job(job.id)

    assert job.status == LessonGenerationJobStatus.invalid_output
    assert job.response_json["source_answer"] == source_response
    assert job.response_json["source_brief"]["answer"] == source_response["answer"]
    assert job.response_json["parse_error"] == "Expected up to 2 blueprint modules, got 3"
    assert job.response_json["structured_output"]["failed_stage"] == "blueprint"
    assert published == []
