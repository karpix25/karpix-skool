from datetime import datetime
from typing import Optional

from sqlalchemy.exc import SQLAlchemyError
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from ...db import async_session_maker
from ...models import Course, Module, User
from ...models_generation import LessonGenerationJob, LessonGenerationJobStatus
from ...schemas.lesson_generation import LessonGenerationCreate
from .error_status import generation_client_error_status, notebook_parse_error_status
from .job_response_payloads import source_parse_failure_response_json
from .parser import LessonGenerationParseError, parse_generated_lessons
from .prompts import build_source_lesson_prompt
from .provider import LessonGenerationClientError, create_lesson_generation_provider
from .publisher import create_draft_lessons_from_generation


async def create_lesson_generation_job(
    *,
    session: AsyncSession,
    module: Module,
    course: Course,
    current_user: User,
    request: LessonGenerationCreate,
) -> LessonGenerationJob:
    job = LessonGenerationJob(
        tenant_id=course.tenant_id,
        course_id=course.id,
        module_id=module.id,
        created_by_user_id=current_user.id,
        notebook_url=request.notebook_url,
        lesson_count=request.lesson_count,
        audience_level=request.audience_level,
        style=request.style,
        request_json=request.model_dump(),
    )
    session.add(job)
    await session.commit()
    await session.refresh(job)
    return job


async def get_next_queued_job(session: AsyncSession) -> Optional[LessonGenerationJob]:
    stmt = (
        select(LessonGenerationJob)
        .where(LessonGenerationJob.status == LessonGenerationJobStatus.queued)
        .order_by(LessonGenerationJob.created_at.asc())
        .limit(1)
        .with_for_update(skip_locked=True)
    )
    result = await session.exec(stmt)
    return result.first()


async def process_next_lesson_generation_job() -> bool:
    async with async_session_maker() as session:
        async with session.begin():
            job = await get_next_queued_job(session)
            if not job:
                return False
            job.status = LessonGenerationJobStatus.running
            job.started_at = datetime.utcnow()
            job.updated_at = job.started_at
            session.add(job)
            job_id = job.id

    await process_lesson_generation_job(job_id)
    return True


async def process_lesson_generation_job(job_id) -> None:
    async with async_session_maker() as session:
        job = await session.get(LessonGenerationJob, job_id)
        if not job:
            return

        module = await session.get(Module, job.module_id)
        course = await session.get(Course, job.course_id)
        if not module or module.deleted_at or not course or course.deleted_at:
            await _mark_failed(session, job, LessonGenerationJobStatus.failed, "Module or course no longer exists")
            return

    client = create_lesson_generation_provider()
    source_response = None
    try:
        prompt = build_source_lesson_prompt(job, module.title)
        source_response = await client.ask_lessons(source_url=job.notebook_url, question=prompt)
        generated = parse_generated_lessons(source_response["answer"], max_lessons=job.lesson_count)
    except LessonGenerationParseError as exc:
        async with async_session_maker() as session:
            job = await session.get(LessonGenerationJob, job_id)
            if job:
                job.response_json = source_parse_failure_response_json(
                    source_response=source_response,
                    error=str(exc),
                )
                await _mark_failed(session, job, notebook_parse_error_status(exc), str(exc))
        return
    except LessonGenerationClientError as exc:
        status = _generation_client_error_status(exc)
        async with async_session_maker() as session:
            job = await session.get(LessonGenerationJob, job_id)
            if job:
                await _mark_failed(session, job, status, str(exc))
        return

    async with async_session_maker() as session:
        job = await session.get(LessonGenerationJob, job_id)
        module = await session.get(Module, job.module_id) if job else None
        course = await session.get(Course, job.course_id) if job else None
        if not job or not module or not course:
            return

        try:
            job.response_json = {
                "source_answer": source_response,
                "notebook_answer": source_response,
                "lessons": [lesson.model_dump() for lesson in generated.lessons],
            }
            job.status = LessonGenerationJobStatus.drafts_created
            await create_draft_lessons_from_generation(
                session=session,
                job=job,
                module=module,
                course=course,
                generated=generated,
            )
        except SQLAlchemyError as exc:
            await session.rollback()
            await _mark_failed(session, job, LessonGenerationJobStatus.failed, str(exc))


def _generation_client_error_status(exc: LessonGenerationClientError) -> LessonGenerationJobStatus:
    return generation_client_error_status(exc)


def _notebook_client_error_status(exc: LessonGenerationClientError) -> LessonGenerationJobStatus:
    return _generation_client_error_status(exc)


async def _mark_failed(
    session: AsyncSession,
    job: LessonGenerationJob,
    status: LessonGenerationJobStatus,
    error: str,
) -> None:
    job.status = status
    job.error = error[:2000]
    job.updated_at = datetime.utcnow()
    job.completed_at = job.updated_at
    session.add(job)
    await session.commit()
