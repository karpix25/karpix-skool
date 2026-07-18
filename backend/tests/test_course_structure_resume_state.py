from datetime import datetime
import uuid

import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlmodel import SQLModel
from sqlmodel.ext.asyncio.session import AsyncSession

from app import models  # noqa: F401 - register referenced tables
from app.models_generation import (
    CourseStructureGenerationCheckpoint,
    CourseStructureGenerationJob,
    CourseStructureLessonTaskStatus,
    LessonGenerationJobStatus,
)
from app.services.lesson_generation.course_structure_checkpoints import (
    get_checkpoint,
    upsert_checkpoint,
)
from app.services.lesson_generation.course_structure_lesson_tasks import (
    LessonTaskSeed,
    claim_next_lesson_task,
    seed_lesson_tasks,
    update_lesson_task,
)
from app.services.lesson_generation.course_structure_progress import refresh_job_progress
from app.services.lesson_generation.course_structure_resume import resume_course_structure_job
from app.services.lesson_generation.course_structure_job_runner import _checkpoint_notebook_id


@pytest_asyncio.fixture
async def session():
    engine = create_async_engine("sqlite+aiosqlite://")
    async with engine.begin() as connection:
        await connection.run_sync(SQLModel.metadata.create_all)
    maker = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with maker() as current_session:
        yield current_session
    await engine.dispose()


def make_job() -> CourseStructureGenerationJob:
    return CourseStructureGenerationJob(
        tenant_id=uuid.uuid4(),
        course_id=uuid.uuid4(),
        created_by_user_id=uuid.uuid4(),
        notebook_url="https://example.com/notebook",
    )


@pytest.mark.asyncio
async def test_checkpoint_upsert_preserves_other_stage_payloads(session: AsyncSession):
    job = make_job()
    session.add(job)
    await session.flush()

    created = await upsert_checkpoint(
        session,
        job.id,
        current_stage="source_brief",
        source_brief_json={"summary": "brief"},
    )
    updated = await upsert_checkpoint(
        session,
        job.id,
        current_stage="blueprint",
        blueprint_json={"modules": []},
    )

    assert updated.id == created.id
    assert updated.source_brief_json == {"summary": "brief"}
    assert updated.blueprint_json == {"modules": []}
    assert (await get_checkpoint(session, job.id)).current_stage == "blueprint"


def test_checkpoint_notebook_id_uses_source_brief_response_payload():
    checkpoint = CourseStructureGenerationCheckpoint(
        job_id=uuid.uuid4(),
        source_brief_json={"notebook_id": " notebook:created-for-source "},
    )

    assert _checkpoint_notebook_id(checkpoint) == "notebook:created-for-source"


@pytest.mark.asyncio
async def test_seed_is_idempotent_and_claims_in_order(session: AsyncSession):
    job = make_job()
    session.add(job)
    await session.flush()
    seeds = [
        LessonTaskSeed(module_index=0, lesson_index=1, order_index=1, lesson_title="Second"),
        LessonTaskSeed(module_index=0, lesson_index=0, order_index=0, lesson_title="First"),
    ]

    first_seed = await seed_lesson_tasks(session, job.id, seeds)
    second_seed = await seed_lesson_tasks(session, job.id, seeds)
    claimed = await claim_next_lesson_task(session, job.id, now=datetime(2026, 7, 10))

    assert {task.id for task in first_seed} == {task.id for task in second_seed}
    assert claimed.lesson_title == "First"
    assert claimed.status == CourseStructureLessonTaskStatus.running
    assert claimed.attempt_count == 1


@pytest.mark.asyncio
async def test_progress_and_resume_only_retry_selected_states(session: AsyncSession):
    job = make_job()
    session.add(job)
    await session.flush()
    tasks = await seed_lesson_tasks(
        session,
        job.id,
        [LessonTaskSeed(0, index, index) for index in range(4)],
    )
    await update_lesson_task(session, tasks[0], status=CourseStructureLessonTaskStatus.draft_ready)
    await update_lesson_task(
        session,
        tasks[1],
        status=CourseStructureLessonTaskStatus.failed,
        error="provider failed",
    )
    await update_lesson_task(session, tasks[2], status=CourseStructureLessonTaskStatus.source_gap)
    await update_lesson_task(session, tasks[3], status=CourseStructureLessonTaskStatus.needs_repair)

    progress = await refresh_job_progress(session, job)
    resumed = await resume_course_structure_job(session, job)

    assert (progress.planned, progress.ready, progress.failed, progress.source_gap) == (4, 1, 1, 1)
    assert resumed.resumed_task_count == 2
    assert tasks[1].status == CourseStructureLessonTaskStatus.pending
    assert tasks[2].status == CourseStructureLessonTaskStatus.source_gap
    assert tasks[3].status == CourseStructureLessonTaskStatus.pending
    assert job.status == LessonGenerationJobStatus.queued
    assert job.resume_count == 1
    assert job.planned_lesson_count == 4
    assert job.failed_lesson_count == 0
    assert job.source_gap_lesson_count == 1
