from datetime import datetime
from enum import Enum
from typing import Any, Dict, Optional
import uuid

import sqlalchemy as sa
from sqlmodel import Field, SQLModel


class LessonGenerationJobStatus(str, Enum):
    queued = "queued"
    running = "running"
    needs_reauth = "needs_reauth"
    invalid_notebook = "invalid_notebook"
    invalid_output = "invalid_output"
    failed = "failed"
    partial_drafts = "partial_drafts"
    needs_attention = "needs_attention"
    drafts_created = "drafts_created"


class CourseStructureLessonTaskStatus(str, Enum):
    pending = "pending"
    running = "running"
    draft_ready = "draft_ready"
    needs_repair = "needs_repair"
    source_gap = "source_gap"
    failed = "failed"


class LessonGenerationJob(SQLModel, table=True):
    __table_args__ = (
        sa.Index("ix_lessongenerationjob_module_status", "module_id", "status"),
        sa.Index("ix_lessongenerationjob_tenant_created", "tenant_id", sa.text("created_at DESC")),
    )

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    tenant_id: uuid.UUID = Field(foreign_key="tenant.id", index=True)
    course_id: uuid.UUID = Field(foreign_key="course.id", index=True)
    module_id: uuid.UUID = Field(foreign_key="module.id", index=True)
    created_by_user_id: uuid.UUID = Field(foreign_key="user.id", index=True)
    notebook_url: str = Field(max_length=2048)
    lesson_count: int = Field(default=5)
    audience_level: Optional[str] = Field(default=None, max_length=120)
    style: Optional[str] = Field(default=None, max_length=240)
    status: LessonGenerationJobStatus = Field(
        default=LessonGenerationJobStatus.queued,
        sa_column=sa.Column(sa.String(32), nullable=False, index=True),
    )
    request_json: Optional[Dict[str, Any]] = Field(default=None, sa_type=sa.JSON)
    response_json: Optional[Dict[str, Any]] = Field(default=None, sa_type=sa.JSON)
    error: Optional[str] = Field(default=None, max_length=2000)
    created_lesson_count: int = Field(default=0)
    created_at: datetime = Field(default_factory=datetime.utcnow, index=True)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    started_at: Optional[datetime] = Field(default=None)
    completed_at: Optional[datetime] = Field(default=None)


class CourseStructureGenerationJob(SQLModel, table=True):
    __table_args__ = (
        sa.Index("ix_coursestructuregenerationjob_course_status", "course_id", "status"),
        sa.Index("ix_coursestructuregenerationjob_tenant_created", "tenant_id", sa.text("created_at DESC")),
    )

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    tenant_id: uuid.UUID = Field(foreign_key="tenant.id", index=True)
    course_id: uuid.UUID = Field(foreign_key="course.id", index=True)
    created_by_user_id: uuid.UUID = Field(foreign_key="user.id", index=True)
    notebook_url: str = Field(max_length=2048)
    module_count: int = Field(default=4)
    lessons_per_module: int = Field(default=4)
    audience_level: Optional[str] = Field(default=None, max_length=120)
    style: Optional[str] = Field(default=None, max_length=240)
    status: LessonGenerationJobStatus = Field(
        default=LessonGenerationJobStatus.queued,
        sa_column=sa.Column(sa.String(32), nullable=False, index=True),
    )
    request_json: Optional[Dict[str, Any]] = Field(default=None, sa_type=sa.JSON)
    response_json: Optional[Dict[str, Any]] = Field(default=None, sa_type=sa.JSON)
    error: Optional[str] = Field(default=None, max_length=2000)
    created_module_count: int = Field(default=0)
    created_lesson_count: int = Field(default=0)
    current_stage: Optional[str] = Field(default=None, max_length=64, index=True)
    planned_lesson_count: int = Field(default=0)
    ready_lesson_count: int = Field(default=0)
    failed_lesson_count: int = Field(default=0)
    source_gap_lesson_count: int = Field(default=0)
    resume_count: int = Field(default=0)
    heartbeat_at: Optional[datetime] = Field(default=None, index=True)
    idempotency_key: Optional[str] = Field(default=None, max_length=128, unique=True, index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow, index=True)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    started_at: Optional[datetime] = Field(default=None)
    completed_at: Optional[datetime] = Field(default=None)


class GeneratedLessonDraft(SQLModel, table=True):
    __table_args__ = (
        sa.Index("ix_generatedlessondraft_job_order", "job_id", "order_index"),
    )

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    job_id: uuid.UUID = Field(foreign_key="lessongenerationjob.id", index=True)
    lesson_id: uuid.UUID = Field(foreign_key="lesson.id", index=True)
    order_index: int = Field(default=0)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class GeneratedCourseModuleDraft(SQLModel, table=True):
    __table_args__ = (
        sa.Index("ix_generatedcoursemoduledraft_job_order", "job_id", "order_index"),
    )

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    job_id: uuid.UUID = Field(foreign_key="coursestructuregenerationjob.id", index=True)
    module_id: uuid.UUID = Field(foreign_key="module.id", index=True)
    order_index: int = Field(default=0)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class CourseStructureGenerationCheckpoint(SQLModel, table=True):
    __table_args__ = (
        sa.UniqueConstraint("job_id", name="uq_course_structure_checkpoint_job"),
    )

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    job_id: uuid.UUID = Field(
        foreign_key="coursestructuregenerationjob.id",
        index=True,
    )
    current_stage: Optional[str] = Field(default=None, max_length=64)
    source_fingerprint: Optional[str] = Field(default=None, max_length=128, index=True)
    prompt_version: Optional[str] = Field(default=None, max_length=64)
    provider: Optional[str] = Field(default=None, max_length=64)
    model_name: Optional[str] = Field(default=None, max_length=160)
    source_brief_json: Optional[Dict[str, Any]] = Field(default=None, sa_type=sa.JSON)
    source_map_json: Optional[Dict[str, Any]] = Field(default=None, sa_type=sa.JSON)
    product_strategy_json: Optional[Dict[str, Any]] = Field(default=None, sa_type=sa.JSON)
    blueprint_json: Optional[Dict[str, Any]] = Field(default=None, sa_type=sa.JSON)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class CourseStructureLessonTask(SQLModel, table=True):
    __table_args__ = (
        sa.UniqueConstraint(
            "job_id",
            "module_index",
            "lesson_index",
            name="uq_course_structure_lesson_task_position",
        ),
        sa.Index("ix_course_structure_lesson_task_claim", "job_id", "status", "order_index"),
    )

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    job_id: uuid.UUID = Field(
        foreign_key="coursestructuregenerationjob.id",
        index=True,
    )
    module_index: int
    lesson_index: int
    order_index: int = Field(default=0)
    lesson_title: Optional[str] = Field(default=None, max_length=500)
    status: CourseStructureLessonTaskStatus = Field(
        default=CourseStructureLessonTaskStatus.pending,
        sa_column=sa.Column(sa.String(32), nullable=False, index=True),
    )
    source_pack_json: Optional[Dict[str, Any]] = Field(default=None, sa_type=sa.JSON)
    lesson_payload_json: Optional[Dict[str, Any]] = Field(default=None, sa_type=sa.JSON)
    audit_json: Optional[Dict[str, Any]] = Field(default=None, sa_type=sa.JSON)
    error: Optional[str] = Field(default=None, max_length=2000)
    attempt_count: int = Field(default=0)
    module_id: Optional[uuid.UUID] = Field(default=None, foreign_key="module.id", index=True)
    lesson_id: Optional[uuid.UUID] = Field(default=None, foreign_key="lesson.id", index=True)
    claimed_at: Optional[datetime] = Field(default=None)
    heartbeat_at: Optional[datetime] = Field(default=None, index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
