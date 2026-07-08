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
    drafts_created = "drafts_created"


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
