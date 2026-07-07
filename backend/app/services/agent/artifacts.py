from datetime import datetime
from typing import Any, Dict, Optional
import uuid

from sqlmodel.ext.asyncio.session import AsyncSession

from ...models_agent import (
    AgentApproval,
    AgentApprovalStatus,
    AgentApprovalType,
    AgentArtifact,
    AgentArtifactType,
    AgentRun,
    AgentStep,
    AgentStepStatus,
)


def create_course_media_artifact(
    *,
    session: AsyncSession,
    run: AgentRun,
    step: AgentStep,
    resource_type: str,
    resource_id: uuid.UUID,
    url: str | None,
    title: Optional[str] = None,
) -> AgentArtifact | None:
    if not url:
        return None

    return create_artifact(
        session=session,
        run=run,
        step=step,
        artifact_type=AgentArtifactType.media,
        resource_type=resource_type,
        resource_id=resource_id,
        title=title,
        payload_json={"url": url},
    )


def create_step(
    *,
    session: AsyncSession,
    run: AgentRun,
    name: str,
    sequence: int,
    input_json: Optional[Dict[str, Any]] = None,
) -> AgentStep:
    step = AgentStep(
        run_id=run.id,
        tenant_id=run.tenant_id,
        sequence=sequence,
        name=name,
        input_json=input_json,
    )
    session.add(step)
    return step


def complete_step(step: AgentStep, output_json: Dict[str, Any]) -> None:
    now = datetime.utcnow()
    step.status = AgentStepStatus.completed
    step.output_json = output_json
    step.updated_at = now
    step.completed_at = now


def create_artifact(
    *,
    session: AsyncSession,
    run: AgentRun,
    step: AgentStep,
    artifact_type: AgentArtifactType,
    resource_type: str,
    resource_id: uuid.UUID,
    title: Optional[str] = None,
    payload_json: Optional[Dict[str, Any]] = None,
) -> AgentArtifact:
    artifact = AgentArtifact(
        run_id=run.id,
        step_id=step.id,
        tenant_id=run.tenant_id,
        artifact_type=artifact_type,
        resource_type=resource_type,
        resource_id=resource_id,
        title=title,
        payload_json=payload_json,
    )
    session.add(artifact)
    return artifact


def create_draft_approval(
    *,
    session: AsyncSession,
    run: AgentRun,
    requested_by_user_id: uuid.UUID,
    target_artifact_id: uuid.UUID,
    request_json: Dict[str, Any],
) -> AgentApproval:
    approval = AgentApproval(
        run_id=run.id,
        tenant_id=run.tenant_id,
        requested_by_user_id=requested_by_user_id,
        approval_type=AgentApprovalType.course_draft_review,
        status=AgentApprovalStatus.pending,
        target_artifact_id=target_artifact_id,
        request_json=request_json,
    )
    session.add(approval)
    return approval
