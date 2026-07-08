from datetime import datetime
from enum import Enum
from typing import Any, Dict, Optional
import uuid

import sqlalchemy as sa
from sqlmodel import Field, SQLModel


class CourseGenerationStage(str, Enum):
    intake = "intake"
    blueprint = "blueprint"
    lesson_drafts = "lesson_drafts"
    media_assets = "media_assets"
    review = "review"
    publish = "publish"


class CourseGenerationRunStatus(str, Enum):
    queued = "queued"
    running = "running"
    waiting_for_review = "waiting_for_review"
    ready_to_publish = "ready_to_publish"
    publishing = "publishing"
    published = "published"
    failed = "failed"
    cancelled = "cancelled"


class CourseGenerationArtifactType(str, Enum):
    source = "source"
    blueprint = "blueprint"
    module_blueprint = "module_blueprint"
    lesson_draft = "lesson_draft"
    media_asset = "media_asset"
    publish_checklist = "publish_checklist"


class CourseGenerationArtifactStatus(str, Enum):
    pending = "pending"
    generated = "generated"
    approved = "approved"
    rejected = "rejected"
    failed = "failed"
    published = "published"


class CourseGenerationRun(SQLModel, table=True):
    __table_args__ = (
        sa.Index("ix_coursegenerationrun_tenant_created", "tenant_id", sa.text("created_at DESC")),
        sa.Index("ix_coursegenerationrun_course_status", "course_id", "status"),
    )

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    tenant_id: uuid.UUID = Field(foreign_key="tenant.id", index=True)
    course_id: Optional[uuid.UUID] = Field(default=None, foreign_key="course.id", nullable=True, index=True)
    created_by_user_id: uuid.UUID = Field(foreign_key="user.id", index=True)
    status: CourseGenerationRunStatus = Field(
        default=CourseGenerationRunStatus.queued,
        sa_column=sa.Column(sa.String(32), nullable=False, index=True),
    )
    current_stage: CourseGenerationStage = Field(
        default=CourseGenerationStage.intake,
        sa_column=sa.Column(sa.String(40), nullable=False, index=True),
    )
    input_json: Optional[Dict[str, Any]] = Field(default=None, sa_type=sa.JSON)
    checklist_json: Optional[Dict[str, Any]] = Field(default=None, sa_type=sa.JSON)
    error: Optional[str] = Field(default=None, max_length=2000)
    created_at: datetime = Field(default_factory=datetime.utcnow, index=True)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    started_at: Optional[datetime] = Field(default=None)
    completed_at: Optional[datetime] = Field(default=None)


class CourseGenerationArtifact(SQLModel, table=True):
    __table_args__ = (
        sa.Index("ix_coursegenerationartifact_run_type", "run_id", "artifact_type"),
        sa.Index("ix_coursegenerationartifact_resource", "resource_type", "resource_id"),
    )

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    run_id: uuid.UUID = Field(foreign_key="coursegenerationrun.id", index=True)
    tenant_id: uuid.UUID = Field(foreign_key="tenant.id", index=True)
    stage: CourseGenerationStage = Field(
        default=CourseGenerationStage.intake,
        sa_column=sa.Column(sa.String(40), nullable=False, index=True),
    )
    artifact_type: CourseGenerationArtifactType = Field(
        sa_column=sa.Column(sa.String(80), nullable=False, index=True),
    )
    status: CourseGenerationArtifactStatus = Field(
        default=CourseGenerationArtifactStatus.pending,
        sa_column=sa.Column(sa.String(32), nullable=False, index=True),
    )
    resource_type: Optional[str] = Field(default=None, max_length=120, index=True)
    resource_id: Optional[uuid.UUID] = Field(default=None, index=True)
    title: Optional[str] = Field(default=None, max_length=240)
    payload_json: Optional[Dict[str, Any]] = Field(default=None, sa_type=sa.JSON)
    review_notes: Optional[str] = Field(default=None, max_length=2000)
    created_at: datetime = Field(default_factory=datetime.utcnow, index=True)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    approved_at: Optional[datetime] = Field(default=None)
    rejected_at: Optional[datetime] = Field(default=None)
