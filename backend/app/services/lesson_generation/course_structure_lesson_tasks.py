from dataclasses import dataclass
from datetime import datetime
from typing import Any, Iterable
import uuid

from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from ...models_generation import CourseStructureLessonTask, CourseStructureLessonTaskStatus


@dataclass(frozen=True)
class LessonTaskSeed:
    module_index: int
    lesson_index: int
    order_index: int
    lesson_title: str | None = None


async def seed_lesson_tasks(
    session: AsyncSession,
    job_id: uuid.UUID,
    seeds: Iterable[LessonTaskSeed],
) -> list[CourseStructureLessonTask]:
    result = await session.exec(
        select(CourseStructureLessonTask).where(CourseStructureLessonTask.job_id == job_id)
    )
    existing = {(task.module_index, task.lesson_index): task for task in result.all()}
    tasks: list[CourseStructureLessonTask] = []
    for seed in seeds:
        position = (seed.module_index, seed.lesson_index)
        task = existing.get(position)
        if task is None:
            task = CourseStructureLessonTask(job_id=job_id, **seed.__dict__)
            session.add(task)
            existing[position] = task
        tasks.append(task)
    await session.flush()
    return tasks


async def claim_next_lesson_task(
    session: AsyncSession,
    job_id: uuid.UUID,
    *,
    now: datetime | None = None,
) -> CourseStructureLessonTask | None:
    claimed_at = now or datetime.utcnow()
    statement = (
        select(CourseStructureLessonTask)
        .where(CourseStructureLessonTask.job_id == job_id)
        .where(CourseStructureLessonTask.status == CourseStructureLessonTaskStatus.pending)
        .order_by(CourseStructureLessonTask.order_index.asc())
        .with_for_update(skip_locked=True)
        .limit(1)
    )
    result = await session.exec(statement)
    task = result.first()
    if task is None:
        return None
    task.status = CourseStructureLessonTaskStatus.running
    task.claimed_at = claimed_at
    task.heartbeat_at = claimed_at
    task.updated_at = claimed_at
    task.attempt_count += 1
    await session.flush()
    return task


async def update_lesson_task(
    session: AsyncSession,
    task: CourseStructureLessonTask,
    *,
    status: CourseStructureLessonTaskStatus,
    source_pack_json: dict[str, Any] | None = None,
    lesson_payload_json: dict[str, Any] | None = None,
    audit_json: dict[str, Any] | None = None,
    error: str | None = None,
    module_id: uuid.UUID | None = None,
    lesson_id: uuid.UUID | None = None,
    now: datetime | None = None,
) -> CourseStructureLessonTask:
    changed_at = now or datetime.utcnow()
    task.status = status
    task.source_pack_json = source_pack_json if source_pack_json is not None else task.source_pack_json
    task.lesson_payload_json = lesson_payload_json if lesson_payload_json is not None else task.lesson_payload_json
    task.audit_json = audit_json if audit_json is not None else task.audit_json
    task.error = error
    task.module_id = module_id if module_id is not None else task.module_id
    task.lesson_id = lesson_id if lesson_id is not None else task.lesson_id
    task.heartbeat_at = changed_at
    task.updated_at = changed_at
    session.add(task)
    await session.flush()
    return task


async def heartbeat_lesson_task(
    session: AsyncSession,
    task: CourseStructureLessonTask,
    *,
    now: datetime | None = None,
) -> None:
    heartbeat_at = now or datetime.utcnow()
    task.heartbeat_at = heartbeat_at
    task.updated_at = heartbeat_at
    session.add(task)
    await session.flush()
