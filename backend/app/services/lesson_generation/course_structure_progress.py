from dataclasses import dataclass
from datetime import datetime
import uuid

from sqlalchemy import case, func
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from ...models_generation import (
    CourseStructureGenerationJob,
    CourseStructureLessonTask,
    CourseStructureLessonTaskStatus,
)


@dataclass(frozen=True)
class CourseStructureProgress:
    planned: int
    ready: int
    failed: int
    source_gap: int
    running: int
    pending: int
    needs_repair: int

    @property
    def complete(self) -> bool:
        return self.planned > 0 and self.ready == self.planned


async def aggregate_lesson_task_progress(
    session: AsyncSession,
    job_id: uuid.UUID,
) -> CourseStructureProgress:
    statuses = CourseStructureLessonTaskStatus
    statement = select(
        func.count(CourseStructureLessonTask.id),
        func.sum(case((CourseStructureLessonTask.status == statuses.draft_ready, 1), else_=0)),
        func.sum(case((CourseStructureLessonTask.status == statuses.failed, 1), else_=0)),
        func.sum(case((CourseStructureLessonTask.status == statuses.source_gap, 1), else_=0)),
        func.sum(case((CourseStructureLessonTask.status == statuses.running, 1), else_=0)),
        func.sum(case((CourseStructureLessonTask.status == statuses.pending, 1), else_=0)),
        func.sum(case((CourseStructureLessonTask.status == statuses.needs_repair, 1), else_=0)),
    ).where(CourseStructureLessonTask.job_id == job_id)
    row = (await session.exec(statement)).one()
    values = [int(value or 0) for value in row]
    return CourseStructureProgress(*values)


async def refresh_job_progress(
    session: AsyncSession,
    job: CourseStructureGenerationJob,
    *,
    now: datetime | None = None,
) -> CourseStructureProgress:
    progress = await aggregate_lesson_task_progress(session, job.id)
    job.planned_lesson_count = progress.planned
    job.ready_lesson_count = progress.ready
    job.failed_lesson_count = progress.failed
    job.source_gap_lesson_count = progress.source_gap
    job.heartbeat_at = now or datetime.utcnow()
    job.updated_at = job.heartbeat_at
    session.add(job)
    await session.flush()
    return progress
