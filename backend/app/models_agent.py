from datetime import datetime
from enum import Enum
from typing import Any, Dict, Optional
import uuid

import sqlalchemy as sa
from sqlmodel import Field, SQLModel


class AgentTaskType(str, Enum):
    create_course_draft = "create_course_draft"


class AgentRunStatus(str, Enum):
    running = "running"
    draft_created = "draft_created"
    approved = "approved"
    published = "published"
    rejected = "rejected"
    failed = "failed"


class AgentStepStatus(str, Enum):
    running = "running"
    completed = "completed"
    failed = "failed"


class AgentArtifactType(str, Enum):
    course = "course"
    module = "module"
    lesson = "lesson"
    media = "media"
    course_structure_generation_job = "course_structure_generation_job"


class AgentApprovalType(str, Enum):
    course_draft_review = "course_draft_review"


class AgentApprovalStatus(str, Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"


class AgentRun(SQLModel, table=True):
    __table_args__ = (
        sa.Index("ix_agentrun_tenant_created", "tenant_id", sa.text("created_at DESC")),
        sa.Index("ix_agentrun_created_by_status", "created_by_user_id", "status"),
    )

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    tenant_id: uuid.UUID = Field(foreign_key="tenant.id", index=True)
    created_by_user_id: uuid.UUID = Field(foreign_key="user.id", index=True)
    task_type: AgentTaskType = Field(
        default=AgentTaskType.create_course_draft,
        sa_column=sa.Column(sa.String(80), nullable=False, index=True),
    )
    status: AgentRunStatus = Field(
        default=AgentRunStatus.draft_created,
        sa_column=sa.Column(sa.String(32), nullable=False, index=True),
    )
    approval_status: AgentApprovalStatus = Field(
        default=AgentApprovalStatus.pending,
        sa_column=sa.Column(sa.String(32), nullable=False, index=True),
    )
    input_json: Optional[Dict[str, Any]] = Field(default=None, sa_type=sa.JSON)
    error: Optional[str] = Field(default=None, max_length=2000)
    created_at: datetime = Field(default_factory=datetime.utcnow, index=True)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = Field(default=None)


class AgentStep(SQLModel, table=True):
    __table_args__ = (
        sa.Index("ix_agentstep_run_sequence", "run_id", "sequence"),
    )

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    run_id: uuid.UUID = Field(foreign_key="agentrun.id", index=True)
    tenant_id: uuid.UUID = Field(foreign_key="tenant.id", index=True)
    sequence: int = Field(default=0)
    name: str = Field(max_length=120)
    status: AgentStepStatus = Field(
        default=AgentStepStatus.running,
        sa_column=sa.Column(sa.String(32), nullable=False, index=True),
    )
    input_json: Optional[Dict[str, Any]] = Field(default=None, sa_type=sa.JSON)
    output_json: Optional[Dict[str, Any]] = Field(default=None, sa_type=sa.JSON)
    error: Optional[str] = Field(default=None, max_length=2000)
    created_at: datetime = Field(default_factory=datetime.utcnow, index=True)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = Field(default=None)


class AgentArtifact(SQLModel, table=True):
    __table_args__ = (
        sa.Index("ix_agentartifact_run_type", "run_id", "artifact_type"),
        sa.Index("ix_agentartifact_resource", "resource_type", "resource_id"),
    )

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    run_id: uuid.UUID = Field(foreign_key="agentrun.id", index=True)
    step_id: Optional[uuid.UUID] = Field(default=None, foreign_key="agentstep.id", index=True)
    tenant_id: uuid.UUID = Field(foreign_key="tenant.id", index=True)
    artifact_type: AgentArtifactType = Field(
        sa_column=sa.Column(sa.String(80), nullable=False, index=True),
    )
    resource_type: str = Field(max_length=120, index=True)
    resource_id: uuid.UUID = Field(index=True)
    title: Optional[str] = Field(default=None, max_length=240)
    payload_json: Optional[Dict[str, Any]] = Field(default=None, sa_type=sa.JSON)
    created_at: datetime = Field(default_factory=datetime.utcnow, index=True)


class AgentApproval(SQLModel, table=True):
    __table_args__ = (
        sa.Index("ix_agentapproval_run_status", "run_id", "status"),
        sa.Index("ix_agentapproval_tenant_status", "tenant_id", "status"),
    )

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    run_id: uuid.UUID = Field(foreign_key="agentrun.id", index=True)
    tenant_id: uuid.UUID = Field(foreign_key="tenant.id", index=True)
    requested_by_user_id: uuid.UUID = Field(foreign_key="user.id", index=True)
    approval_type: AgentApprovalType = Field(
        default=AgentApprovalType.course_draft_review,
        sa_column=sa.Column(sa.String(80), nullable=False, index=True),
    )
    status: AgentApprovalStatus = Field(
        default=AgentApprovalStatus.pending,
        sa_column=sa.Column(sa.String(32), nullable=False, index=True),
    )
    target_artifact_id: Optional[uuid.UUID] = Field(default=None, foreign_key="agentartifact.id", index=True)
    request_json: Optional[Dict[str, Any]] = Field(default=None, sa_type=sa.JSON)
    response_json: Optional[Dict[str, Any]] = Field(default=None, sa_type=sa.JSON)
    created_at: datetime = Field(default_factory=datetime.utcnow, index=True)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    decided_at: Optional[datetime] = Field(default=None)
    decided_by_user_id: Optional[uuid.UUID] = Field(default=None, foreign_key="user.id", index=True)
