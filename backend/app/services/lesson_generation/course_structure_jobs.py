from datetime import datetime
from typing import Optional

from sqlalchemy.exc import SQLAlchemyError
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from ...db import async_session_maker
from ...models import Course, User
from ...models_generation import CourseStructureGenerationJob, LessonGenerationJobStatus
from ...schemas.lesson_generation import CourseStructureGenerationCreate
from .course_structure_publisher import create_draft_modules_and_lessons_from_generation
from .error_status import generation_client_error_status, notebook_parse_error_status
from .job_response_payloads import source_parse_failure_response_json
from .parser import LessonGenerationParseError, parse_generated_course_structure
from .prompts import build_source_course_structure_prompt
from .provider import LessonGenerationClientError, create_lesson_generation_provider
from .source_inputs import (
    generation_sources_from_job,
    generation_sources_from_request,
    primary_generation_source_ref,
)


async def create_course_structure_generation_job(
    *,
    session: AsyncSession,
    course: Course,
    current_user: User,
    request: CourseStructureGenerationCreate,
    commit: bool = True,
) -> CourseStructureGenerationJob:
    sources = generation_sources_from_request(
        sources=request.sources,
        legacy_source_url=request.notebook_url,
    )
    job = CourseStructureGenerationJob(
        tenant_id=course.tenant_id,
        course_id=course.id,
        created_by_user_id=current_user.id,
        notebook_url=primary_generation_source_ref(sources),
        module_count=request.module_count,
        lessons_per_module=request.lessons_per_module,
        audience_level=request.audience_level,
        style=request.style,
        request_json=request.model_dump(mode="json"),
    )
    session.add(job)
    if commit:
        await session.commit()
        await session.refresh(job)
    else:
        await session.flush()
    return job


async def get_next_queued_course_structure_job(session: AsyncSession) -> Optional[CourseStructureGenerationJob]:
    stmt = (
        select(CourseStructureGenerationJob)
        .where(CourseStructureGenerationJob.status == LessonGenerationJobStatus.queued)
        .order_by(CourseStructureGenerationJob.created_at.asc())
        .limit(1)
        .with_for_update(skip_locked=True)
    )
    result = await session.exec(stmt)
    return result.first()


async def process_next_course_structure_generation_job() -> bool:
    async with async_session_maker() as session:
        async with session.begin():
            job = await get_next_queued_course_structure_job(session)
            if not job:
                return False
            job.status = LessonGenerationJobStatus.running
            job.started_at = datetime.utcnow()
            job.updated_at = job.started_at
            session.add(job)
            job_id = job.id

    await process_course_structure_generation_job(job_id)
    return True


async def process_course_structure_generation_job(job_id) -> None:
    async with async_session_maker() as session:
        job = await session.get(CourseStructureGenerationJob, job_id)
        if not job:
            return

        course = await session.get(Course, job.course_id)
        if not course or course.deleted_at:
            await _mark_failed(session, job, LessonGenerationJobStatus.failed, "Course no longer exists")
            return

    client = create_lesson_generation_provider()
    source_response = None
    try:
        prompt = build_source_course_structure_prompt(job, course.title)
        sources = generation_sources_from_job(
            request_json=job.request_json,
            legacy_source_url=job.notebook_url,
        )
        source_response = await client.ask_from_sources(sources=sources, question=prompt)
        generated = parse_generated_course_structure(
            source_response["answer"],
            max_modules=job.module_count,
            max_lessons_per_module=job.lessons_per_module,
        )
    except LessonGenerationParseError as exc:
        async with async_session_maker() as session:
            job = await session.get(CourseStructureGenerationJob, job_id)
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
            job = await session.get(CourseStructureGenerationJob, job_id)
            if job:
                await _mark_failed(session, job, status, str(exc))
        return

    async with async_session_maker() as session:
        job = await session.get(CourseStructureGenerationJob, job_id)
        course = await session.get(Course, job.course_id) if job else None
        if not job or not course:
            return

        try:
            job.response_json = {
                "source_answer": source_response,
                "notebook_answer": source_response,
                "modules": [module.model_dump() for module in generated.modules],
            }
            job.status = LessonGenerationJobStatus.drafts_created
            await create_draft_modules_and_lessons_from_generation(
                session=session,
                job=job,
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
    job: CourseStructureGenerationJob,
    status: LessonGenerationJobStatus,
    error: str,
) -> None:
    job.status = status
    job.error = error[:2000]
    job.updated_at = datetime.utcnow()
    job.completed_at = job.updated_at
    session.add(job)
    await session.commit()
