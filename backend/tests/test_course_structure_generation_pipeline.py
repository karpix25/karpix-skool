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
from app.services.lesson_generation.course_structure_generator import (
    CourseStructureParseRetryError,
    CourseStructureResult,
)


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


@pytest.mark.asyncio
async def test_process_course_structure_job_builds_structure_from_source_brief(monkeypatch):
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
    generated = GeneratedCourseStructurePayload(
        modules=[
            GeneratedCourseModulePayload(
                title="Ниши и оффер",
                lessons=[GeneratedLessonPayload(title="Где деньги", html="<h2>Старт</h2><p>Текст</p>")],
            )
        ]
    )
    published = []

    class FakeLessonGenerationProvider:
        async def ask_from_sources(self, *, sources, question, notebook_id=None, transformation=None):
            assert notebook_id == "notebook:course"
            assert transformation.name == course_structure_jobs.SOURCE_BRIEF_TRANSFORMATION.name
            assert "Return plain text only" in question
            return source_response

    class FakeCourseStructureGenerator:
        async def generate(self, *, source_brief, job, course_title):
            assert "AI-ниши" in source_brief
            assert course_title == "Деньги в ИИ"
            return CourseStructureResult(
                generated=generated,
                response_json={"provider": "fake_structurer", "answer": '{"modules":[]}', "attempts": 1},
            )

    async def fake_publish(**kwargs):
        published.append(kwargs)
        kwargs["job"].created_module_count = 1
        kwargs["job"].created_lesson_count = 1

    monkeypatch.setattr(course_structure_jobs, "async_session_maker", lambda: session)
    monkeypatch.setattr(course_structure_jobs, "create_lesson_generation_provider", lambda: FakeLessonGenerationProvider())
    monkeypatch.setattr(course_structure_jobs, "create_course_structure_generator", lambda: FakeCourseStructureGenerator())
    monkeypatch.setattr(course_structure_jobs, "create_draft_modules_and_lessons_from_generation", fake_publish)

    await course_structure_jobs.process_course_structure_generation_job(job.id)

    assert job.status == LessonGenerationJobStatus.drafts_created
    assert job.response_json["source_answer"] == source_response
    assert job.response_json["notebook_answer"] == source_response
    assert job.response_json["source_brief"]["answer"] == source_response["answer"]
    assert job.response_json["structured_output"]["provider"] == "fake_structurer"
    assert job.response_json["modules"][0]["title"] == "Ниши и оффер"
    assert published[0]["generated"] == generated


@pytest.mark.asyncio
async def test_process_course_structure_job_preserves_source_brief_when_structuring_fails(monkeypatch):
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

    class FakeLessonGenerationProvider:
        async def ask_from_sources(self, *, sources, question, notebook_id=None, transformation=None):
            return source_response

    class FakeCourseStructureGenerator:
        async def generate(self, *, source_brief, job, course_title):
            raise CourseStructureParseRetryError(
                "Open Notebook returned invalid JSON: unterminated string",
                response_json={
                    "provider": "fake_structurer",
                    "answer": '{"modules":[{"title":"Broken"',
                    "attempts": 2,
                },
            )

    monkeypatch.setattr(course_structure_jobs, "async_session_maker", lambda: session)
    monkeypatch.setattr(course_structure_jobs, "create_lesson_generation_provider", lambda: FakeLessonGenerationProvider())
    monkeypatch.setattr(course_structure_jobs, "create_course_structure_generator", lambda: FakeCourseStructureGenerator())

    await course_structure_jobs.process_course_structure_generation_job(job.id)

    assert job.status == LessonGenerationJobStatus.invalid_output
    assert job.response_json["source_answer"] == source_response
    assert job.response_json["source_brief"]["answer"] == source_response["answer"]
    assert job.response_json["structured_output"]["answer"] == '{"modules":[{"title":"Broken"'
