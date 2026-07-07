from datetime import datetime
import uuid

from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from ...models import Course, Lesson, Module, User
from ...models_agent import (
    AgentApproval,
    AgentApprovalStatus,
    AgentArtifact,
    AgentArtifactType,
    AgentRun,
    AgentRunStatus,
)
from ...models_generation import CourseStructureGenerationJob, LessonGenerationJobStatus
from ...schemas.agent import (
    AgentApprovalDecisionCreate,
    AgentPublishCreate,
    AgentPublishResult,
    AgentRunCreate,
    AgentRunRead,
)
from ..cache_invalidation import invalidate_course_write_caches
from ..course_notifications import notify_lesson_published
from .exceptions import AgentRunOperationError
from .runs import create_agent_run, get_agent_run_detail


async def approve_agent_run(
    *,
    session: AsyncSession,
    run: AgentRun,
    current_user: User,
    request: AgentApprovalDecisionCreate,
) -> AgentRunRead:
    if run.approval_status == AgentApprovalStatus.approved:
        return await get_agent_run_detail(session=session, run=run)
    _ensure_can_decide(run, {AgentApprovalStatus.pending})

    approval = await _get_decision_approval(session=session, run=run)
    _set_approval_decision(
        approval=approval,
        status=AgentApprovalStatus.approved,
        user_id=current_user.id,
        note=request.note,
    )
    run.status = AgentRunStatus.approved
    run.approval_status = AgentApprovalStatus.approved
    run.updated_at = datetime.utcnow()
    session.add(run)
    session.add(approval)
    await session.commit()
    await session.refresh(run)
    return await get_agent_run_detail(session=session, run=run)


async def reject_agent_run(
    *,
    session: AsyncSession,
    run: AgentRun,
    current_user: User,
    request: AgentApprovalDecisionCreate,
) -> AgentRunRead:
    if run.status == AgentRunStatus.published:
        raise AgentRunOperationError("Published agent runs cannot be rejected", 409)
    if run.approval_status == AgentApprovalStatus.rejected:
        return await get_agent_run_detail(session=session, run=run)
    _ensure_can_decide(run, {AgentApprovalStatus.pending, AgentApprovalStatus.approved})

    approval = await _get_decision_approval(session=session, run=run)
    _set_approval_decision(
        approval=approval,
        status=AgentApprovalStatus.rejected,
        user_id=current_user.id,
        note=request.note,
    )
    run.status = AgentRunStatus.rejected
    run.approval_status = AgentApprovalStatus.rejected
    run.updated_at = datetime.utcnow()
    session.add(run)
    session.add(approval)
    await session.commit()
    await session.refresh(run)
    return await get_agent_run_detail(session=session, run=run)


async def publish_agent_run(
    *,
    session: AsyncSession,
    run: AgentRun,
    current_user: User,
    request: AgentPublishCreate,
) -> AgentPublishResult:
    if run.approval_status != AgentApprovalStatus.approved:
        raise AgentRunOperationError("Agent run must be approved before publishing", 409)

    course = await _get_agent_course(session=session, run=run)
    await _ensure_structure_jobs_completed(session=session, run=run)
    lessons = await _get_course_lessons(session=session, course_id=course.id)
    newly_published_lessons = [lesson for lesson in lessons if not lesson.is_published]

    course.is_published = True
    for lesson in newly_published_lessons:
        lesson.is_published = True
        session.add(lesson)

    now = datetime.utcnow()
    run.status = AgentRunStatus.published
    run.approval_status = AgentApprovalStatus.approved
    run.updated_at = now
    run.completed_at = now
    _update_publish_response(
        approval=await _get_decision_approval(session=session, run=run),
        user_id=current_user.id,
        request=request,
        published_lessons_count=len(newly_published_lessons),
    )
    session.add(course)
    session.add(run)
    await session.commit()
    await session.refresh(run)
    await invalidate_course_write_caches(course_id=course.id, tenant_id=run.tenant_id)

    notification_count = 0
    if request.notify_subscribers:
        for lesson in newly_published_lessons:
            notification_count += await notify_lesson_published(session=session, lesson=lesson)

    return AgentPublishResult(
        run=await get_agent_run_detail(session=session, run=run),
        course_id=course.id,
        published_lessons_count=len(newly_published_lessons),
        notification_deliveries_count=notification_count,
    )


async def retry_agent_run(
    *,
    session: AsyncSession,
    run: AgentRun,
    current_user: User,
) -> AgentRunRead:
    if run.status not in {AgentRunStatus.failed, AgentRunStatus.rejected}:
        raise AgentRunOperationError("Only failed or rejected agent runs can be retried", 409)
    if not run.input_json:
        raise AgentRunOperationError("Agent run has no input payload to retry", 409)

    retry_request = AgentRunCreate.model_validate(run.input_json)
    return await create_agent_run(
        session=session,
        current_user=current_user,
        request=retry_request,
    )


def _ensure_can_decide(run: AgentRun, allowed: set[AgentApprovalStatus]) -> None:
    if run.status == AgentRunStatus.published:
        raise AgentRunOperationError("Published agent runs cannot be changed", 409)
    if run.approval_status not in allowed:
        raise AgentRunOperationError(f"Agent run is already {run.approval_status.value}", 409)


async def _get_decision_approval(*, session: AsyncSession, run: AgentRun) -> AgentApproval:
    approvals = await _fetch_run_approvals(session=session, run_id=run.id)
    for approval in approvals:
        if approval.status == AgentApprovalStatus.pending:
            return approval
    if approvals:
        return approvals[-1]
    raise AgentRunOperationError("Agent run has no approval request", 409)


async def _get_agent_course(*, session: AsyncSession, run: AgentRun) -> Course:
    artifacts = await _fetch_run_artifacts(session=session, run_id=run.id)
    course_artifact = next(
        (
            artifact for artifact in artifacts
            if _is_artifact_type(artifact, AgentArtifactType.course)
            and artifact.resource_type == "course"
        ),
        None,
    )
    if not course_artifact:
        raise AgentRunOperationError("Agent run has no course artifact", 409)

    course = await session.get(Course, course_artifact.resource_id)
    if not course or course.deleted_at:
        raise AgentRunOperationError("Agent course draft was not found", 404)
    if course.tenant_id != run.tenant_id:
        raise AgentRunOperationError("Agent course belongs to another tenant", 409)
    return course


async def _get_course_lessons(
    *,
    session: AsyncSession,
    course_id: uuid.UUID,
) -> list[Lesson]:
    result = await session.exec(
        select(Lesson)
        .join(Module)
        .where(
            Module.course_id == course_id,
            Module.deleted_at == None,
            Lesson.deleted_at == None,
        )
        .order_by(Module.order_index, Lesson.order_index)
    )
    return result.all()


async def _ensure_structure_jobs_completed(*, session: AsyncSession, run: AgentRun) -> None:
    artifacts = await _fetch_run_artifacts(session=session, run_id=run.id)
    for artifact in artifacts:
        if not _is_artifact_type(artifact, AgentArtifactType.course_structure_generation_job):
            continue
        job = await session.get(CourseStructureGenerationJob, artifact.resource_id)
        if not job:
            raise AgentRunOperationError("NotebookLM structure job was not found", 409)
        if job.status != LessonGenerationJobStatus.drafts_created:
            raise AgentRunOperationError("NotebookLM structure job must finish before publishing", 409)


async def _fetch_run_artifacts(*, session: AsyncSession, run_id: uuid.UUID) -> list[AgentArtifact]:
    result = await session.exec(
        select(AgentArtifact)
        .where(AgentArtifact.run_id == run_id)
        .order_by(AgentArtifact.created_at)
    )
    return result.all()


async def _fetch_run_approvals(*, session: AsyncSession, run_id: uuid.UUID) -> list[AgentApproval]:
    result = await session.exec(
        select(AgentApproval)
        .where(AgentApproval.run_id == run_id)
        .order_by(AgentApproval.created_at)
    )
    return result.all()


def _set_approval_decision(
    *,
    approval: AgentApproval,
    status: AgentApprovalStatus,
    user_id: uuid.UUID,
    note: str | None,
) -> None:
    now = datetime.utcnow()
    approval.status = status
    approval.decided_at = now
    approval.decided_by_user_id = user_id
    approval.updated_at = now
    approval.response_json = _decision_payload(note=note)


def _update_publish_response(
    *,
    approval: AgentApproval,
    user_id: uuid.UUID,
    request: AgentPublishCreate,
    published_lessons_count: int,
) -> None:
    now = datetime.utcnow()
    payload = _decision_payload(note=request.note)
    payload.update(
        {
            "published": True,
            "published_lessons_count": published_lessons_count,
            "notify_subscribers": request.notify_subscribers,
        }
    )
    approval.status = AgentApprovalStatus.approved
    approval.decided_at = approval.decided_at or now
    approval.decided_by_user_id = approval.decided_by_user_id or user_id
    approval.updated_at = now
    approval.response_json = payload


def _decision_payload(*, note: str | None) -> dict[str, object]:
    payload: dict[str, object] = {}
    if note:
        payload["note"] = note
    return payload


def _is_artifact_type(artifact: AgentArtifact, expected: AgentArtifactType) -> bool:
    return artifact.artifact_type == expected or artifact.artifact_type == expected.value
