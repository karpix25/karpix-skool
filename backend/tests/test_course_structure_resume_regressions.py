from datetime import datetime, timedelta
import uuid

import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlmodel import SQLModel
from sqlmodel.ext.asyncio.session import AsyncSession

from app import models  # noqa: F401 - register referenced tables
from app.models import Course
from app.models_generation import (
    CourseStructureGenerationJob,
    CourseStructureLessonTask,
    CourseStructureLessonTaskStatus,
    LessonGenerationJobStatus,
)
from app.schemas.lesson_generation import (
    CourseStructureGenerationCreate,
    CourseStructureGenerationJobRead,
    GeneratedLessonPayload,
)
from app.services.lesson_generation.course_structure_draft_writer import (
    persist_lesson_task_draft,
)
from app.services.lesson_generation.course_structure_jobs import (
    _ensure_idempotent_request_matches,
)
from app.services.lesson_generation.course_structure_resume import (
    recover_stale_course_structure_jobs,
    resume_course_structure_job,
)
from app.services.lesson_generation.course_structure_stage_payloads import (
    LessonSourcePackPayload,
)
from app.services.lesson_generation.course_structure_task_cache import (
    build_lesson_source_cache,
    read_lesson_source_cache,
)
from app.services.lesson_generation.source_evidence import (
    EvidenceKind,
    LessonEvidencePack,
    SourceEvidenceItem,
)


@pytest_asyncio.fixture
async def session():
    engine = create_async_engine("sqlite+aiosqlite://")
    async with engine.begin() as connection:
        await connection.run_sync(SQLModel.metadata.create_all)
    maker = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with maker() as current_session:
        yield current_session
    await engine.dispose()


def make_job(**overrides) -> CourseStructureGenerationJob:
    values = {
        "tenant_id": uuid.uuid4(),
        "course_id": uuid.uuid4(),
        "created_by_user_id": uuid.uuid4(),
        "notebook_url": "https://example.com/notebook",
        "idempotency_key": f"course-{uuid.uuid4()}",
    }
    values.update(overrides)
    return CourseStructureGenerationJob(**values)


def make_request(**overrides) -> CourseStructureGenerationCreate:
    values = {
        "source_url": "https://example.com/source",
        "module_count": 3,
        "lessons_per_module": 2,
        "course_goal": "Собрать рабочий проект",
        "idempotency_key": "course-run-v1",
    }
    values.update(overrides)
    return CourseStructureGenerationCreate.model_validate(values)


@pytest.mark.parametrize(
    "status",
    [
        LessonGenerationJobStatus.needs_attention,
        LessonGenerationJobStatus.partial_drafts,
        LessonGenerationJobStatus.invalid_output,
        LessonGenerationJobStatus.failed,
    ],
)
def test_can_resume_before_lesson_tasks_exist(status: LessonGenerationJobStatus):
    job = make_job(
        status=status,
        current_stage="source_map",
        planned_lesson_count=0,
        failed_lesson_count=0,
        source_gap_lesson_count=0,
    )

    payload = CourseStructureGenerationJobRead.model_validate(job)

    assert payload.can_resume is True
    assert payload.progress == 0


@pytest.mark.asyncio
async def test_resume_without_lesson_tasks_requeues_pre_stage_job(session: AsyncSession):
    job = make_job(
        status=LessonGenerationJobStatus.failed,
        current_stage="source_map",
        error="planner timed out",
        completed_at=datetime(2026, 7, 10, 10, 0),
    )
    session.add(job)
    await session.flush()

    result = await resume_course_structure_job(
        session,
        job,
        now=datetime(2026, 7, 10, 11, 0),
    )

    assert result.resumed_task_count == 0
    assert result.had_lesson_tasks is False
    assert job.status == LessonGenerationJobStatus.queued
    assert job.current_stage == "resume"
    assert job.error is None
    assert job.completed_at is None
    assert job.resume_count == 1


@pytest.mark.asyncio
async def test_stale_recovery_requeues_only_expired_task_while_fresh_task_runs(session: AsyncSession):
    now = datetime(2026, 7, 10, 12, 0)
    job = make_job(
        status=LessonGenerationJobStatus.running,
        heartbeat_at=now - timedelta(hours=1),
        current_stage="lessons",
    )
    session.add(job)
    await session.flush()
    stale_task = CourseStructureLessonTask(
        job_id=job.id,
        module_index=0,
        lesson_index=0,
        order_index=0,
        status=CourseStructureLessonTaskStatus.running,
        claimed_at=now - timedelta(hours=1),
        heartbeat_at=now - timedelta(hours=1),
    )
    fresh_task = CourseStructureLessonTask(
        job_id=job.id,
        module_index=0,
        lesson_index=1,
        order_index=1,
        status=CourseStructureLessonTaskStatus.running,
        claimed_at=now,
        heartbeat_at=now,
    )
    session.add_all([stale_task, fresh_task])
    await session.flush()

    recovered = await recover_stale_course_structure_jobs(
        session,
        now=now,
        stale_after=timedelta(minutes=30),
    )

    assert recovered == 0
    assert job.status == LessonGenerationJobStatus.running
    assert job.heartbeat_at == fresh_task.heartbeat_at
    assert stale_task.status == CourseStructureLessonTaskStatus.pending
    assert stale_task.claimed_at is None
    assert stale_task.heartbeat_at is None
    assert fresh_task.status == CourseStructureLessonTaskStatus.running


@pytest.mark.asyncio
async def test_stale_recovery_requeues_job_when_no_fresh_task_remains(session: AsyncSession):
    now = datetime(2026, 7, 10, 12, 0)
    job = make_job(
        status=LessonGenerationJobStatus.running,
        heartbeat_at=now - timedelta(hours=1),
    )
    session.add(job)
    await session.flush()
    task = CourseStructureLessonTask(
        job_id=job.id,
        module_index=0,
        lesson_index=0,
        order_index=0,
        status=CourseStructureLessonTaskStatus.running,
        heartbeat_at=now - timedelta(hours=1),
    )
    session.add(task)
    await session.flush()

    recovered = await recover_stale_course_structure_jobs(session, now=now)

    assert recovered == 1
    assert job.status == LessonGenerationJobStatus.queued
    assert task.status == CourseStructureLessonTaskStatus.pending


def test_lesson_source_cache_roundtrip_and_fingerprint_miss():
    source_pack = LessonSourcePackPayload(
        facts=["Навык создаётся в каталоге .claude/skills"],
        process_steps=["Создать SKILL.md"],
        examples=["youtube-parser"],
        constraints=["Не хранить секреты в файле навыка"],
    )
    evidence_pack = LessonEvidencePack(
        evidence=[
            SourceEvidenceItem(
                kind=EvidenceKind.FACT,
                claim="Навык описывается в SKILL.md",
                quote="Создайте файл SKILL.md",
                source_id="source-1",
                source_title="Claude Code guide",
                lesson_use="Показать обязательный файл навыка",
            )
        ],
        sufficiency="sufficient",
    )
    payload = build_lesson_source_cache(
        source_fingerprint="sha256:source-v1",
        source_pack=source_pack,
        evidence_pack=evidence_pack,
    )

    hit = read_lesson_source_cache(payload, source_fingerprint="sha256:source-v1")

    assert hit is not None
    assert hit.source_pack == source_pack
    assert hit.evidence_pack == evidence_pack
    assert read_lesson_source_cache(payload, source_fingerprint="sha256:source-v2") is None


def test_lesson_source_cache_rejects_unknown_version_and_invalid_payload():
    assert read_lesson_source_cache(
        {"cache_version": "future-v2", "source_fingerprint": "same"},
        source_fingerprint="same",
    ) is None
    assert read_lesson_source_cache(
        {
            "cache_version": "lesson-evidence-v1",
            "source_fingerprint": "same",
            "source_pack": "not-an-object",
            "evidence_pack": {},
        },
        source_fingerprint="same",
    ) is None


@pytest.mark.asyncio
async def test_draft_writer_updates_untouched_draft_but_preserves_manual_edit(
    session: AsyncSession,
):
    course = Course(id=uuid.uuid4(), tenant_id=uuid.uuid4(), title="Claude Code")
    job = make_job(course_id=course.id, tenant_id=course.tenant_id)
    task = CourseStructureLessonTask(
        job_id=job.id,
        module_index=0,
        lesson_index=0,
        order_index=0,
        lesson_title="Первый навык",
    )
    session.add_all([course, job, task])
    await session.flush()
    first_payload = GeneratedLessonPayload(
        title="Первый навык",
        html="<p>Исходный машинный черновик</p>",
        icon_emoji="🧩",
    )

    module, lesson, created = await persist_lesson_task_draft(
        session=session,
        job=job,
        course=course,
        task=task,
        module_title="Навыки",
        lesson=first_payload,
    )
    task.lesson_payload_json = first_payload.model_dump(mode="json")
    session.add(task)
    await session.flush()
    repaired_payload = GeneratedLessonPayload(
        title="Первый полезный навык",
        html="<p>Исправленный машинный черновик</p>",
        icon_emoji="🛠️",
    )

    same_module, same_lesson, updated = await persist_lesson_task_draft(
        session=session,
        job=job,
        course=course,
        task=task,
        module_title="Навыки",
        lesson=repaired_payload,
    )

    assert created is True
    assert updated is True
    assert same_module.id == module.id
    assert same_lesson.id == lesson.id
    assert lesson.title == repaired_payload.title
    assert lesson.content == repaired_payload.html

    task.lesson_payload_json = repaired_payload.model_dump(mode="json")
    lesson.title = "Название от редактора"
    lesson.content = "<p>Ручная редактура администратора</p>"
    session.add_all([task, lesson])
    await session.flush()
    later_payload = GeneratedLessonPayload(
        title="Автоматическая версия 3",
        html="<p>Ещё одна автоматическая версия</p>",
        icon_emoji="🤖",
    )

    _, preserved_lesson, overwritten = await persist_lesson_task_draft(
        session=session,
        job=job,
        course=course,
        task=task,
        module_title="Навыки",
        lesson=later_payload,
    )

    assert overwritten is False
    assert preserved_lesson.title == "Название от редактора"
    assert preserved_lesson.content == "<p>Ручная редактура администратора</p>"


def test_idempotent_request_accepts_same_payload_with_another_key():
    original = make_request(idempotency_key="original-key")
    job = make_job(
        idempotency_key="original-key",
        request_json=original.model_dump(mode="json"),
    )

    _ensure_idempotent_request_matches(
        job,
        make_request(idempotency_key="transport-retry-key"),
    )


def test_idempotent_request_rejects_payload_change():
    original = make_request(idempotency_key="stable-key")
    job = make_job(
        idempotency_key="stable-key",
        request_json=original.model_dump(mode="json"),
    )

    with pytest.raises(ValueError, match="another request"):
        _ensure_idempotent_request_matches(
            job,
            make_request(idempotency_key="stable-key", module_count=4),
        )
