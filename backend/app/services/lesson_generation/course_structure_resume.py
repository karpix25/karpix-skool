from dataclasses import dataclass
from datetime import datetime, timedelta
import uuid

from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from ...models_generation import (
    CourseStructureGenerationJob,
    CourseStructureLessonTask,
    CourseStructureLessonTaskStatus,
    LessonGenerationJobStatus,
)
from .course_structure_progress import refresh_job_progress


@dataclass(frozen=True)
class ResumeResult:
    resumed_task_count: int
    included_source_gaps: bool
    had_lesson_tasks: bool = True


async def requeue_stale_running_tasks(
    session: AsyncSession,
    job_id: uuid.UUID,
    *,
    stale_before: datetime,
    now: datetime | None = None,
) -> int:
    requeued_at = now or datetime.utcnow()
    statement = (
        select(CourseStructureLessonTask)
        .where(CourseStructureLessonTask.job_id == job_id)
        .where(CourseStructureLessonTask.status == CourseStructureLessonTaskStatus.running)
        .where(CourseStructureLessonTask.heartbeat_at < stale_before)
        .with_for_update(skip_locked=True)
    )
    tasks = (await session.exec(statement)).all()
    for task in tasks:
        task.status = CourseStructureLessonTaskStatus.pending
        task.error = "Recovered after worker heartbeat expired"
        task.claimed_at = None
        task.heartbeat_at = None
        task.updated_at = requeued_at
        session.add(task)
    await session.flush()
    return len(tasks)


async def recover_stale_course_structure_jobs(
    session: AsyncSession,
    *,
    now: datetime | None = None,
    stale_after: timedelta = timedelta(minutes=30),
) -> int:
    recovered_at = now or datetime.utcnow()
    stale_before = recovered_at - stale_after
    jobs = (
        await session.exec(
            select(CourseStructureGenerationJob)
            .where(CourseStructureGenerationJob.status == LessonGenerationJobStatus.running)
            .where(CourseStructureGenerationJob.idempotency_key != None)
            .where(CourseStructureGenerationJob.heartbeat_at < stale_before)
            .with_for_update(skip_locked=True)
        )
    ).all()
    recovered_jobs = 0
    for job in jobs:
        await requeue_stale_running_tasks(
            session,
            job.id,
            stale_before=stale_before,
            now=recovered_at,
        )
        fresh_running_task = (
            await session.exec(
                select(CourseStructureLessonTask)
                .where(CourseStructureLessonTask.job_id == job.id)
                .where(CourseStructureLessonTask.status == CourseStructureLessonTaskStatus.running)
                .where(CourseStructureLessonTask.heartbeat_at >= stale_before)
                .limit(1)
            )
        ).first()
        if fresh_running_task is not None:
            job.heartbeat_at = fresh_running_task.heartbeat_at
            session.add(job)
            continue
        job.status = LessonGenerationJobStatus.queued
        job.error = "Recovered after worker heartbeat expired"
        job.completed_at = None
        job.updated_at = recovered_at
        session.add(job)
        recovered_jobs += 1
    await session.flush()
    return recovered_jobs


async def resume_course_structure_job(
    session: AsyncSession,
    job: CourseStructureGenerationJob,
    *,
    include_source_gaps: bool = False,
    now: datetime | None = None,
) -> ResumeResult:
    resumed_at = now or datetime.utcnow()
    resumable = [
        CourseStructureLessonTaskStatus.failed,
        CourseStructureLessonTaskStatus.needs_repair,
        CourseStructureLessonTaskStatus.running,
    ]
    if include_source_gaps:
        resumable.append(CourseStructureLessonTaskStatus.source_gap)
    statement = (
        select(CourseStructureLessonTask)
        .where(CourseStructureLessonTask.job_id == job.id)
        .where(CourseStructureLessonTask.status.in_(resumable))
        .with_for_update()
    )
    tasks = (await session.exec(statement)).all()
    all_tasks = (
        await session.exec(
            select(CourseStructureLessonTask).where(CourseStructureLessonTask.job_id == job.id)
        )
    ).all()
    for task in tasks:
        task.status = CourseStructureLessonTaskStatus.pending
        task.error = None
        task.claimed_at = None
        task.heartbeat_at = None
        task.updated_at = resumed_at
        session.add(task)

    job.status = LessonGenerationJobStatus.queued
    job.current_stage = "lessons" if all_tasks else "resume"
    job.error = None
    job.completed_at = None
    job.resume_count += 1
    job.heartbeat_at = resumed_at
    job.updated_at = resumed_at
    session.add(job)
    await session.flush()
    await refresh_job_progress(session, job, now=resumed_at)
    return ResumeResult(len(tasks), include_source_gaps, bool(all_tasks))


async def get_job_by_idempotency_key(
    session: AsyncSession,
    idempotency_key: str,
) -> CourseStructureGenerationJob | None:
    result = await session.exec(
        select(CourseStructureGenerationJob).where(
            CourseStructureGenerationJob.idempotency_key == idempotency_key
        )
    )
    return result.one_or_none()
