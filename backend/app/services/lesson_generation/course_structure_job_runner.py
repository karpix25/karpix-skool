import hashlib
import json
from datetime import datetime
from typing import Any
import uuid

from sqlmodel import select

from ...db import async_session_maker
from ...models import Course
from ...models_generation import (
    CourseStructureGenerationJob,
    CourseStructureGenerationCheckpoint,
    CourseStructureLessonTask,
    CourseStructureLessonTaskStatus,
    LessonGenerationJobStatus,
)
from ...schemas.lesson_generation import GeneratedLessonPayload
from ...services.cache_invalidation import invalidate_course_write_caches
from .course_notebooks import assign_course_open_notebook_id, course_open_notebook_id
from .course_generation_observability import CourseGenerationObserver
from .course_source_map import CourseSourceMapPayload
from .course_source_map_service import CourseSourceMapError, CourseSourceMapService, source_map_planning_brief
from .course_structure_checkpoints import get_checkpoint, upsert_checkpoint
from .course_structure_draft_writer import persist_lesson_task_draft
from .course_structure_lesson_tasks import (
    LessonTaskSeed,
    claim_next_lesson_task,
    seed_lesson_tasks,
    update_lesson_task,
)
from .course_structure_planner import CoursePlanningError, CourseStructurePlanner
from .course_structure_progress import refresh_job_progress
from .course_structure_stage_payloads import (
    CourseBlueprintPayload,
    ProductCourseStrategyPayload,
)
from .course_structure_task_cache import build_lesson_source_cache, read_lesson_source_cache
from .error_status import generation_client_error_status
from .lesson_draft_pipeline import (
    LessonDraftPipeline,
    LessonDraftStageError,
    LessonDraftStatus,
)
from .open_notebook_client import OpenNotebookTransformation
from .open_notebook_sources import open_notebook_id_from_sources
from .parser import LessonGenerationParseError
from .prompts import build_source_course_brief_prompt
from .provider import LessonGenerationClientError, create_lesson_generation_provider_from_settings
from .source_brief import SOURCE_BRIEF_TRANSFORMATION_NAME, parse_source_brief, source_brief_response_json
from .source_inputs import generation_sources_from_job


PROMPT_VERSION = "resumable-evidence-review-v1"
OBSERVER = CourseGenerationObserver()
SOURCE_BRIEF_TRANSFORMATION = OpenNotebookTransformation(
    name=SOURCE_BRIEF_TRANSFORMATION_NAME,
    title="Karpix source brief text",
    description="Extracts a plain-text source-grounded course brief for Karpix.",
    prompt=(
        "Extract a dense source-grounded course brief. Use only supplied source context. "
        "Follow the task exactly and return plain text only."
    ),
)


async def process_resumable_course_structure_job(job_id: uuid.UUID) -> None:
    try:
        job, course = await _load_job_and_course(job_id)
        client = await _create_provider()
        sources = generation_sources_from_job(
            request_json=job.request_json,
            legacy_source_url=job.notebook_url,
        )
        metric_ids = {
            "job_id": str(job.id),
            "course_id": str(course.id),
            "tenant_id": str(job.tenant_id),
        }
        async with OBSERVER.stage(stage="source_brief", **metric_ids):
            checkpoint = await _ensure_source_brief(
                job=job,
                course=course,
                sources=sources,
                client=client,
            )
        source_brief = _checkpoint_source_brief(checkpoint)
        notebook_id = _checkpoint_notebook_id(checkpoint) or course_open_notebook_id(course)
        async with OBSERVER.stage(stage="source_map", role="planner", **metric_ids):
            source_map = await _ensure_source_map(job, course, source_brief, checkpoint)
        async with OBSERVER.stage(stage="planning", role="planner", **metric_ids):
            strategy, blueprint = await _ensure_plan(
                job,
                course,
                source_map_planning_brief(source_brief, source_map),
            )
        await _ensure_tasks(job, blueprint)
        await _run_lesson_tasks(
            job_id=job.id,
            course_title=course.title,
            sources=sources,
            notebook_id=notebook_id,
            source_brief=source_brief,
            strategy=strategy,
            blueprint=blueprint,
            client=client,
        )
        await _finish_job(job.id, course)
    except CourseSourceMapError as exc:
        await _fail_job(job_id, LessonGenerationJobStatus.invalid_output, str(exc), {"source_map": exc.audit})
    except CoursePlanningError as exc:
        await _fail_job(job_id, LessonGenerationJobStatus.invalid_output, str(exc), {exc.stage: exc.audit})
    except LessonGenerationClientError as exc:
        await _fail_job(job_id, generation_client_error_status(exc), str(exc))
    except LessonGenerationParseError as exc:
        await _fail_job(job_id, LessonGenerationJobStatus.invalid_output, str(exc))
    except Exception as exc:
        await _fail_job(job_id, LessonGenerationJobStatus.failed, str(exc))


async def _load_job_and_course(
    job_id: uuid.UUID,
) -> tuple[CourseStructureGenerationJob, Course]:
    async with async_session_maker() as session:
        job = await session.get(CourseStructureGenerationJob, job_id)
        if job is None:
            raise LessonGenerationClientError("Course generation job no longer exists")
        course = await session.get(Course, job.course_id)
        if course is None or course.deleted_at:
            raise LessonGenerationClientError("Course no longer exists")
        return job, course


async def _create_provider():
    async with async_session_maker() as session:
        return await create_lesson_generation_provider_from_settings(session)


async def _ensure_source_brief(*, job, course, sources, client) -> CourseStructureGenerationCheckpoint:
    async with async_session_maker() as session:
        checkpoint = await get_checkpoint(session, job.id)
        if checkpoint and checkpoint.source_brief_json:
            return checkpoint

    notebook_id = course_open_notebook_id(course) or open_notebook_id_from_sources(sources)
    response = await client.ask_from_sources(
        sources=sources,
        question=build_source_course_brief_prompt(job, course.title),
        notebook_id=notebook_id,
        transformation=SOURCE_BRIEF_TRANSFORMATION,
    )
    source_brief = parse_source_brief(response)
    async with async_session_maker() as session:
        db_job = await session.get(CourseStructureGenerationJob, job.id)
        db_course = await session.get(Course, job.course_id)
        if db_job is None or db_course is None:
            raise LessonGenerationClientError("Course generation state disappeared")
        assign_course_open_notebook_id(db_course, response)
        db_job.current_stage = "source_map"
        db_job.heartbeat_at = datetime.utcnow()
        db_job.response_json = {
            **(db_job.response_json or {}),
            "source_brief": source_brief_response_json(source_brief),
        }
        checkpoint = await upsert_checkpoint(
            session,
            db_job.id,
            current_stage="source_map",
            source_fingerprint=_source_fingerprint(db_job),
            prompt_version=PROMPT_VERSION,
            source_brief_json=source_brief_response_json(source_brief),
        )
        session.add(db_course)
        session.add(db_job)
        await session.commit()
        await session.refresh(checkpoint)
        return checkpoint


async def _ensure_source_map(job, course, source_brief, checkpoint) -> CourseSourceMapPayload:
    if checkpoint.source_map_json:
        return CourseSourceMapPayload.model_validate(checkpoint.source_map_json)
    result = await CourseSourceMapService().generate(
        source_brief=source_brief,
        job=job,
        course_title=course.title,
    )
    async with async_session_maker() as session:
        db_job = await session.get(CourseStructureGenerationJob, job.id)
        if db_job is None:
            raise LessonGenerationClientError("Course generation job disappeared")
        db_job.current_stage = "planning"
        db_job.response_json = {
            **(db_job.response_json or {}),
            "source_map": result.source_map.model_dump(mode="json"),
            "source_map_generation": result.audit,
        }
        await upsert_checkpoint(
            session,
            job.id,
            current_stage="planning",
            source_map_json=result.source_map.model_dump(mode="json"),
            provider=result.audit.get("provider"),
            model_name=result.audit.get("model"),
        )
        session.add(db_job)
        await session.commit()
    return result.source_map


async def _ensure_plan(job, course, planning_brief):
    async with async_session_maker() as session:
        checkpoint = await get_checkpoint(session, job.id)
        if checkpoint and checkpoint.product_strategy_json and checkpoint.blueprint_json:
            return (
                ProductCourseStrategyPayload.model_validate(checkpoint.product_strategy_json),
                CourseBlueprintPayload.model_validate(checkpoint.blueprint_json),
            )
    result = await CourseStructurePlanner().plan(
        source_brief=planning_brief,
        job=job,
        course_title=course.title,
    )
    async with async_session_maker() as session:
        db_job = await session.get(CourseStructureGenerationJob, job.id)
        if db_job is None:
            raise LessonGenerationClientError("Course generation job disappeared")
        db_job.current_stage = "lessons"
        db_job.response_json = {**(db_job.response_json or {}), "planning": result.audit}
        await upsert_checkpoint(
            session,
            job.id,
            current_stage="lessons",
            product_strategy_json=result.strategy.model_dump(mode="json"),
            blueprint_json=result.blueprint.model_dump(mode="json"),
            provider=result.audit.get("provider"),
            model_name=result.audit.get("model"),
        )
        session.add(db_job)
        await session.commit()
    return result.strategy, result.blueprint


async def _ensure_tasks(job, blueprint: CourseBlueprintPayload) -> None:
    seeds = []
    order_index = 0
    for module_index, module in enumerate(blueprint.modules):
        for lesson_index, lesson in enumerate(module.lessons):
            seeds.append(LessonTaskSeed(module_index, lesson_index, order_index, lesson.title))
            order_index += 1
    async with async_session_maker() as session:
        db_job = await session.get(CourseStructureGenerationJob, job.id)
        if db_job is None:
            return
        await seed_lesson_tasks(session, job.id, seeds)
        db_job.planned_lesson_count = len(seeds)
        db_job.current_stage = "lessons"
        session.add(db_job)
        await session.commit()


async def _run_lesson_tasks(**context) -> None:
    pipeline = LessonDraftPipeline()
    while True:
        async with async_session_maker() as session:
            task = await claim_next_lesson_task(session, context["job_id"])
            if task is None:
                return
            task_id = task.id
            await session.commit()
        await _run_one_lesson_task(task_id=task_id, pipeline=pipeline, **context)


async def _run_one_lesson_task(*, task_id, pipeline, **context) -> None:
    async with async_session_maker() as session:
        task = await session.get(CourseStructureLessonTask, task_id)
        job = await session.get(CourseStructureGenerationJob, context["job_id"])
        course = await session.get(Course, job.course_id) if job else None
    if task is None or job is None or course is None:
        return
    module = context["blueprint"].modules[task.module_index]
    lesson_blueprint = module.lessons[task.lesson_index]
    source_fingerprint = _source_fingerprint(job)
    cached = read_lesson_source_cache(
        task.source_pack_json,
        source_fingerprint=source_fingerprint,
    )
    try:
        async with OBSERVER.stage(
            stage="lesson_pipeline",
            role="writer",
            job_id=str(job.id),
            course_id=str(course.id),
            tenant_id=str(job.tenant_id),
            attempt=task.attempt_count,
        ):
            result = await pipeline.generate(
                client=context["client"],
                sources=context["sources"],
                notebook_id=context["notebook_id"],
                source_brief=context["source_brief"],
                course_title=context["course_title"],
                module=module,
                lesson=lesson_blueprint,
                product_strategy=context["strategy"],
                cached_source_pack=cached.source_pack if cached else None,
                cached_evidence_pack=cached.evidence_pack if cached else None,
            )
        await _persist_task_result(
            job,
            course,
            task_id,
            module.title,
            result,
            source_fingerprint=source_fingerprint,
        )
    except LessonDraftStageError as exc:
        status = (
            CourseStructureLessonTaskStatus.source_gap
            if "insufficient" in str(exc).casefold()
            else CourseStructureLessonTaskStatus.failed
        )
        await _persist_task_error(job.id, task_id, status, str(exc), exc.audit)
    except (LessonGenerationClientError, LessonGenerationParseError) as exc:
        await _persist_task_error(
            job.id,
            task_id,
            CourseStructureLessonTaskStatus.failed,
            str(exc),
        )
    except Exception as exc:
        await _persist_task_error(
            job.id,
            task_id,
            CourseStructureLessonTaskStatus.failed,
            f"Unexpected lesson generation error: {exc}",
        )


async def _persist_task_result(
    job,
    course,
    task_id,
    module_title,
    result,
    *,
    source_fingerprint,
) -> None:
    status_map = {
        LessonDraftStatus.READY: CourseStructureLessonTaskStatus.draft_ready,
        LessonDraftStatus.NEEDS_REVIEW: CourseStructureLessonTaskStatus.needs_repair,
        LessonDraftStatus.SOURCE_GAP: CourseStructureLessonTaskStatus.source_gap,
        LessonDraftStatus.BLOCKED: CourseStructureLessonTaskStatus.failed,
    }
    task_status = status_map[result.status]
    async with async_session_maker() as session:
        task = await session.get(CourseStructureLessonTask, task_id)
        db_job = await session.get(CourseStructureGenerationJob, job.id)
        db_course = await session.get(Course, course.id)
        if task is None or db_job is None or db_course is None:
            return
        module_id = lesson_id = None
        if result.status in {LessonDraftStatus.READY, LessonDraftStatus.NEEDS_REVIEW}:
            module, lesson, was_persisted = await persist_lesson_task_draft(
                session=session,
                job=db_job,
                course=db_course,
                task=task,
                module_title=module_title,
                lesson=result.lesson,
            )
            module_id, lesson_id = module.id, lesson.id
            if result.status is LessonDraftStatus.READY and not was_persisted:
                task_status = CourseStructureLessonTaskStatus.needs_repair
        await update_lesson_task(
            session,
            task,
            status=task_status,
            source_pack_json=build_lesson_source_cache(
                source_fingerprint=source_fingerprint,
                source_pack=result.source_pack,
                evidence_pack=result.evidence_pack,
            ),
            lesson_payload_json=result.lesson.model_dump(mode="json"),
            audit_json=result.audit,
            error=(
                None
                if task_status is CourseStructureLessonTaskStatus.draft_ready
                else "Черновик изменен вручную и не был перезаписан"
                if result.status is LessonDraftStatus.READY and not was_persisted
                else result.review.report.summary
            ),
            module_id=module_id,
            lesson_id=lesson_id,
        )
        await _refresh_counts(session, db_job)
        await session.commit()


async def _persist_task_error(job_id, task_id, status, error, audit=None) -> None:
    async with async_session_maker() as session:
        task = await session.get(CourseStructureLessonTask, task_id)
        job = await session.get(CourseStructureGenerationJob, job_id)
        if task is None or job is None:
            return
        await update_lesson_task(
            session,
            task,
            status=status,
            audit_json=audit,
            error=error[:2000],
        )
        await _refresh_counts(session, job)
        await session.commit()


async def _refresh_counts(session, job) -> None:
    progress = await refresh_job_progress(session, job)
    result = await session.exec(
        select(CourseStructureLessonTask).where(CourseStructureLessonTask.job_id == job.id)
    )
    tasks = result.all()
    job.created_lesson_count = sum(1 for task in tasks if task.lesson_id)
    job.created_module_count = len({task.module_id for task in tasks if task.module_id})
    job.ready_lesson_count = progress.ready
    session.add(job)


async def _finish_job(job_id, course) -> None:
    async with async_session_maker() as session:
        job = await session.get(CourseStructureGenerationJob, job_id)
        if job is None:
            return
        progress = await refresh_job_progress(session, job)
        await _refresh_counts(session, job)
        if progress.complete:
            job.status = LessonGenerationJobStatus.drafts_created
            job.error = None
        elif job.created_lesson_count:
            job.status = LessonGenerationJobStatus.partial_drafts
            job.error = _progress_error(progress)
        else:
            job.status = LessonGenerationJobStatus.needs_attention
            job.error = _progress_error(progress)
        job.current_stage = "review" if not progress.complete else "completed"
        job.completed_at = datetime.utcnow()
        job.updated_at = job.completed_at
        job.response_json = {
            **(job.response_json or {}),
            "progress": progress.__dict__,
            "prompt_version": PROMPT_VERSION,
        }
        session.add(job)
        await session.commit()
    await invalidate_course_write_caches(course_id=course.id, tenant_id=course.tenant_id)


async def _fail_job(job_id, status, error, audit: dict[str, Any] | None = None) -> None:
    async with async_session_maker() as session:
        job = await session.get(CourseStructureGenerationJob, job_id)
        if job is None:
            return
        job.status = status
        job.error = error[:2000]
        job.completed_at = datetime.utcnow()
        job.updated_at = job.completed_at
        if audit:
            job.response_json = {**(job.response_json or {}), "failure": audit}
        session.add(job)
        await session.commit()


def _checkpoint_source_brief(checkpoint: CourseStructureGenerationCheckpoint) -> str:
    payload = checkpoint.source_brief_json or {}
    answer = payload.get("answer")
    if not isinstance(answer, str) or not answer.strip():
        raise LessonGenerationParseError("Course source brief checkpoint is empty")
    return answer.strip()


def _checkpoint_notebook_id(checkpoint: CourseStructureGenerationCheckpoint) -> str | None:
    payload = checkpoint.source_brief_json or {}
    notebook_id = payload.get("notebook_id")
    return notebook_id.strip() if isinstance(notebook_id, str) and notebook_id.strip() else None


def _source_fingerprint(job: CourseStructureGenerationJob) -> str:
    payload = json.dumps(job.request_json or {}, ensure_ascii=False, sort_keys=True)
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def _progress_error(progress) -> str:
    return (
        f"Ready {progress.ready}/{progress.planned}; failed {progress.failed}; "
        f"needs repair {progress.needs_repair}; source gaps {progress.source_gap}"
    )
