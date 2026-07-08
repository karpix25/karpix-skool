from datetime import datetime
from typing import Sequence
import uuid

from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from ...models import User
from ...models_agent import (
    AgentApproval,
    AgentApprovalStatus,
    AgentArtifact,
    AgentArtifactType,
    AgentRun,
    AgentRunStatus,
    AgentStep,
)
from ...schemas.agent import (
    AgentApprovalRead,
    AgentArtifactRead,
    AgentRunCreate,
    AgentRunRead,
    AgentStepRead,
)
from ...schemas.lesson_generation import CourseStructureGenerationCreate
from ..cache_invalidation import invalidate_course_write_caches
from ..lesson_generation.course_structure_jobs import create_course_structure_generation_job
from .artifacts import (
    complete_step,
    create_artifact,
    create_course_media_artifact,
    create_draft_approval,
    create_step,
)
from .course_drafts import create_unpublished_course_draft, create_unpublished_module_drafts


async def create_agent_run(
    *,
    session: AsyncSession,
    current_user: User,
    request: AgentRunCreate,
) -> AgentRunRead:
    request_json = request.model_dump(mode="json")
    run = AgentRun(
        tenant_id=request.tenant_id,
        created_by_user_id=current_user.id,
        task_type=request.task_type,
        status=AgentRunStatus.draft_created,
        approval_status=AgentApprovalStatus.pending,
        input_json=request_json,
    )
    session.add(run)
    await session.flush()

    step = create_step(
        session=session,
        run=run,
        name="create_course_draft",
        sequence=1,
        input_json=request_json,
    )
    course = await create_unpublished_course_draft(
        session=session,
        tenant_id=request.tenant_id,
        title=request.course_title,
        description=request.description,
        cover_url=request.cover_url,
        is_vip=request.is_vip,
    )
    course_artifact = create_artifact(
        session=session,
        run=run,
        step=step,
        artifact_type=AgentArtifactType.course,
        resource_type="course",
        resource_id=course.id,
        title=course.title,
        payload_json={"is_published": course.is_published, "cover_url": course.cover_url},
    )
    create_course_media_artifact(
        session=session,
        run=run,
        step=step,
        resource_type="course_cover",
        resource_id=course.id,
        url=course.cover_url,
        title=course.title,
    )
    module_count, lesson_count = await _create_requested_content_drafts(
        session=session,
        request=request,
        run=run,
        step=step,
        course=course,
    )

    job_id = await _maybe_queue_course_structure_job(
        session=session,
        current_user=current_user,
        request=request,
        course=course,
        run=run,
        step=step,
    )
    complete_step(
        step,
        {
            "course_id": str(course.id),
            "module_count": module_count,
            "lesson_count": lesson_count,
            "course_structure_generation_job_id": _json_uuid(job_id),
        },
    )
    create_draft_approval(
        session=session,
        run=run,
        requested_by_user_id=current_user.id,
        target_artifact_id=course_artifact.id,
        request_json={"course_id": str(course.id), "publish": False},
    )

    run.updated_at = datetime.utcnow()
    session.add(run)
    await session.commit()
    await session.refresh(run)
    await invalidate_course_write_caches(course_id=course.id, tenant_id=run.tenant_id)
    return await get_agent_run_detail(session=session, run=run)


async def get_agent_run(session: AsyncSession, run_id: uuid.UUID) -> AgentRun | None:
    return await session.get(AgentRun, run_id)


async def get_agent_run_detail(*, session: AsyncSession, run: AgentRun) -> AgentRunRead:
    steps = await _fetch_by_run(session, AgentStep, run.id, AgentStep.sequence)
    artifacts = await _fetch_by_run(session, AgentArtifact, run.id, AgentArtifact.created_at)
    approvals = await _fetch_by_run(session, AgentApproval, run.id, AgentApproval.created_at)

    return AgentRunRead(
        id=run.id,
        tenant_id=run.tenant_id,
        created_by_user_id=run.created_by_user_id,
        task_type=run.task_type,
        status=run.status,
        approval_status=run.approval_status,
        input_json=run.input_json,
        error=run.error,
        created_at=run.created_at,
        updated_at=run.updated_at,
        completed_at=run.completed_at,
        steps=[AgentStepRead.model_validate(step) for step in steps],
        artifacts=[AgentArtifactRead.model_validate(artifact) for artifact in artifacts],
        approvals=[AgentApprovalRead.model_validate(approval) for approval in approvals],
    )


async def _maybe_queue_course_structure_job(
    *,
    session: AsyncSession,
    current_user: User,
    request: AgentRunCreate,
    course,
    run: AgentRun,
    step: AgentStep,
) -> uuid.UUID | None:
    if not request.notebook_url:
        return None

    job = await create_course_structure_generation_job(
        session=session,
        course=course,
        current_user=current_user,
        request=CourseStructureGenerationCreate(
            notebook_url=request.notebook_url,
            module_count=request.module_count,
            lessons_per_module=request.lessons_per_module,
            audience_level=request.audience_level,
            style=request.style,
        ),
        commit=False,
    )
    create_artifact(
        session=session,
        run=run,
        step=step,
        artifact_type=AgentArtifactType.course_structure_generation_job,
        resource_type="course_structure_generation_job",
        resource_id=job.id,
        title="Open Notebook course structure job",
        payload_json={"status": job.status.value, "notebook_url": job.notebook_url},
    )
    return job.id


async def _create_requested_content_drafts(
    *,
    session: AsyncSession,
    request: AgentRunCreate,
    run: AgentRun,
    step: AgentStep,
    course,
) -> tuple[int, int]:
    created = await create_unpublished_module_drafts(
        session=session,
        course=course,
        modules=request.modules,
    )
    lesson_count = 0
    for module, lessons in created:
        create_artifact(
            session=session,
            run=run,
            step=step,
            artifact_type=AgentArtifactType.module,
            resource_type="module",
            resource_id=module.id,
            title=module.title,
            payload_json={"course_id": str(course.id)},
        )
        for lesson in lessons:
            lesson_count += 1
            create_artifact(
                session=session,
                run=run,
                step=step,
                artifact_type=AgentArtifactType.lesson,
                resource_type="lesson",
                resource_id=lesson.id,
                title=lesson.title,
                payload_json={
                    "module_id": str(module.id),
                    "is_published": lesson.is_published,
                    "cover_url": lesson.cover_url,
                },
            )
            create_course_media_artifact(
                session=session,
                run=run,
                step=step,
                resource_type="lesson_cover",
                resource_id=lesson.id,
                url=lesson.cover_url,
                title=lesson.title,
            )
    return len(created), lesson_count


async def _fetch_by_run(
    session: AsyncSession,
    model,
    run_id: uuid.UUID,
    order_by,
) -> Sequence:
    result = await session.exec(select(model).where(model.run_id == run_id).order_by(order_by))
    return result.all()


def _json_uuid(value: uuid.UUID | None) -> str | None:
    if value is None:
        return None
    return str(value)
