from datetime import datetime
from typing import Optional

from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from ...db import async_session_maker
from ...models import Course, User
from ...models_generation import CourseStructureGenerationJob, LessonGenerationJobStatus
from ...schemas.lesson_generation import CourseStructureGenerationCreate
from .course_structure_generator import CourseStructureParseRetryError
from .course_structure_pipeline import CourseStructurePipelineError, create_course_structure_pipeline
from .course_structure_publisher import create_draft_modules_and_lessons_from_generation
from .course_notebooks import (
    assign_course_open_notebook_id,
    assign_course_open_notebook_id_value,
    course_open_notebook_id,
)
from .course_structure_resume import get_job_by_idempotency_key, recover_stale_course_structure_jobs
from .error_status import generation_client_error_status, notebook_parse_error_status
from .job_response_payloads import source_parse_failure_response_json
from .parser import LessonGenerationParseError
from .prompts import build_source_course_brief_prompt
from .provider import LessonGenerationClientError, create_lesson_generation_provider
from .open_notebook_client import OpenNotebookTransformation
from .source_inputs import (
    generation_sources_from_job,
    generation_sources_from_request,
    primary_generation_source_ref,
)
from .open_notebook_sources import open_notebook_id_from_sources
from .source_brief import SOURCE_BRIEF_TRANSFORMATION_NAME, parse_source_brief, source_brief_response_json


SOURCE_BRIEF_TRANSFORMATION = OpenNotebookTransformation(
    name=SOURCE_BRIEF_TRANSFORMATION_NAME,
    title="Karpix source brief text",
    description="Extracts a plain-text source-grounded course brief for Karpix.",
    prompt=(
        "You extract dense source-grounded course briefs for Karpix. Follow the task "
        "in the input text exactly. Use only the supplied source context. Return plain text only."
    ),
)


async def create_course_structure_generation_job(
    *,
    session: AsyncSession,
    course: Course,
    current_user: User,
    request: CourseStructureGenerationCreate,
    commit: bool = True,
) -> CourseStructureGenerationJob:
    if request.idempotency_key:
        existing = await get_job_by_idempotency_key(session, request.idempotency_key)
        if existing:
            if existing.course_id != course.id or existing.tenant_id != course.tenant_id:
                raise ValueError("Course generation idempotency key belongs to another course")
            _ensure_idempotent_request_matches(existing, request)
            return existing
    sources = generation_sources_from_request(
        sources=request.sources,
        legacy_source_url=request.notebook_url,
    )
    requested_notebook_id = open_notebook_id_from_sources(sources)
    if assign_course_open_notebook_id_value(course, requested_notebook_id):
        session.add(course)
    job = CourseStructureGenerationJob(
        tenant_id=course.tenant_id,
        course_id=course.id,
        created_by_user_id=current_user.id,
        notebook_url=primary_generation_source_ref(sources),
        module_count=request.module_count,
        lessons_per_module=request.lessons_per_module,
        audience_level=request.audience_level,
        style=request.style,
        idempotency_key=request.idempotency_key,
        request_json=request.model_dump(mode="json"),
    )
    session.add(job)
    if commit:
        try:
            await session.commit()
            await session.refresh(job)
        except IntegrityError:
            await session.rollback()
            if not request.idempotency_key:
                raise
            existing = await get_job_by_idempotency_key(session, request.idempotency_key)
            if existing is None:
                raise
            if existing.course_id != course.id or existing.tenant_id != course.tenant_id:
                raise ValueError("Course generation idempotency key belongs to another course")
            _ensure_idempotent_request_matches(existing, request)
            return existing
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


async def get_latest_course_structure_generation_job(
    session: AsyncSession,
    course: Course,
) -> Optional[CourseStructureGenerationJob]:
    stmt = (
        select(CourseStructureGenerationJob)
        .where(CourseStructureGenerationJob.tenant_id == course.tenant_id)
        .where(CourseStructureGenerationJob.course_id == course.id)
        .where(CourseStructureGenerationJob.status != LessonGenerationJobStatus.drafts_created)
        .order_by(CourseStructureGenerationJob.created_at.desc())
        .limit(1)
    )
    result = await session.exec(stmt)
    return result.first()


async def process_next_course_structure_generation_job() -> bool:
    async with async_session_maker() as session:
        async with session.begin():
            await recover_stale_course_structure_jobs(session)
            job = await get_next_queued_course_structure_job(session)
            if not job:
                return False
            job.status = LessonGenerationJobStatus.running
            job.started_at = datetime.utcnow()
            job.updated_at = job.started_at
            if job.idempotency_key:
                job.heartbeat_at = job.started_at
            session.add(job)
            job_id = job.id

    await process_course_structure_generation_job(job_id)
    return True


def _ensure_idempotent_request_matches(
    job: CourseStructureGenerationJob,
    request: CourseStructureGenerationCreate,
) -> None:
    existing = dict(job.request_json or {})
    existing.pop("idempotency_key", None)
    incoming = request.model_dump(mode="json", exclude={"idempotency_key"})
    if existing != incoming:
        raise ValueError("Course generation idempotency key was already used with another request")


async def process_course_structure_generation_job(job_id) -> None:
    async with async_session_maker() as session:
        job = await session.get(CourseStructureGenerationJob, job_id)
        if not job:
            return

        course = await session.get(Course, job.course_id)
        if not course or course.deleted_at:
            await _mark_failed(session, job, LessonGenerationJobStatus.failed, "Course no longer exists")
            return
        course_notebook_id = course_open_notebook_id(course)
        use_resumable_runner = bool(job.idempotency_key)

    if use_resumable_runner:
        from .course_structure_job_runner import process_resumable_course_structure_job

        await process_resumable_course_structure_job(job_id)
        return

    client = create_lesson_generation_provider()
    source_response = None
    source_brief_payload = None
    structured_response = None
    try:
        prompt = build_source_course_brief_prompt(job, course.title)
        sources = generation_sources_from_job(
            request_json=job.request_json,
            legacy_source_url=job.notebook_url,
        )
        requested_notebook_id = open_notebook_id_from_sources(sources)
        if requested_notebook_id and not course_notebook_id:
            course_notebook_id = requested_notebook_id
            async with async_session_maker() as session:
                course = await session.get(Course, job.course_id)
                if course and assign_course_open_notebook_id_value(course, requested_notebook_id):
                    session.add(course)
                    await session.commit()
        source_response = await client.ask_from_sources(
            sources=sources,
            question=prompt,
            notebook_id=course_notebook_id,
            transformation=SOURCE_BRIEF_TRANSFORMATION,
        )
        response_notebook_id = source_response.get("notebook_id")
        if not course_notebook_id and isinstance(response_notebook_id, str) and response_notebook_id.strip():
            course_notebook_id = response_notebook_id.strip()
            async with async_session_maker() as session:
                course_to_update = await session.get(Course, job.course_id)
                if course_to_update and assign_course_open_notebook_id_value(
                    course_to_update,
                    course_notebook_id,
                ):
                    session.add(course_to_update)
                    await session.commit()
        source_brief = parse_source_brief(source_response)
        source_brief_payload = source_brief_response_json(source_brief)
        structure_result = await create_course_structure_pipeline().generate(
            client=client,
            sources=sources,
            notebook_id=course_notebook_id,
            source_brief=source_brief.text,
            job=job,
            course_title=course.title,
        )
        generated = structure_result.generated
        structured_response = structure_result.response_json
    except CourseStructureParseRetryError as exc:
        structured_response = exc.response_json
        async with async_session_maker() as session:
            job = await session.get(CourseStructureGenerationJob, job_id)
            course = await session.get(Course, job.course_id) if job else None
            if job:
                if course and assign_course_open_notebook_id(course, source_response):
                    session.add(course)
                job.response_json = source_parse_failure_response_json(
                    source_response=source_response,
                    source_brief=source_brief_payload,
                    structured_response=structured_response,
                    error=str(exc),
                )
                await _mark_failed(session, job, notebook_parse_error_status(exc), str(exc))
        return
    except LessonGenerationParseError as exc:
        structured_response = (
            exc.response_json
            if isinstance(exc, CourseStructurePipelineError)
            else structured_response
        )
        async with async_session_maker() as session:
            job = await session.get(CourseStructureGenerationJob, job_id)
            course = await session.get(Course, job.course_id) if job else None
            if job:
                if course and assign_course_open_notebook_id(course, source_response):
                    session.add(course)
                job.response_json = source_parse_failure_response_json(
                    source_response=source_response,
                    source_brief=source_brief_payload,
                    structured_response=structured_response,
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
            if assign_course_open_notebook_id(course, source_response):
                session.add(course)
            job.response_json = {
                "source_answer": source_response,
                "notebook_answer": source_response,
                "source_brief": source_brief_payload,
                "structured_output": structured_response,
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
