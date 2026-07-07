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


class NotebookLMAuthSessionStatus(str, Enum):
    pending = "pending"
    started = "started"
    completed = "completed"
    failed = "failed"
    expired = "expired"


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


class GeneratedLessonDraft(SQLModel, table=True):
    __table_args__ = (
        sa.Index("ix_generatedlessondraft_job_order", "job_id", "order_index"),
    )

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    job_id: uuid.UUID = Field(foreign_key="lessongenerationjob.id", index=True)
    lesson_id: uuid.UUID = Field(foreign_key="lesson.id", index=True)
    order_index: int = Field(default=0)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class NotebookLMAuthSession(SQLModel, table=True):
    __table_args__ = (
        sa.Index("ix_notebooklmauthsession_status_expires", "status", "expires_at"),
        sa.Index("ix_notebooklmauthsession_job_status", "job_id", "status"),
        sa.UniqueConstraint("token_hash", name="uq_notebooklmauthsession_token_hash"),
    )

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    token_hash: str = Field(max_length=64, index=True)
    requested_by_user_id: Optional[uuid.UUID] = Field(default=None, foreign_key="user.id", index=True)
    job_id: Optional[uuid.UUID] = Field(default=None, foreign_key="lessongenerationjob.id", index=True)
    status: NotebookLMAuthSessionStatus = Field(
        default=NotebookLMAuthSessionStatus.pending,
        sa_column=sa.Column(sa.String(32), nullable=False, index=True),
    )
    reason: Optional[str] = Field(default=None, max_length=1000)
    auth_url: Optional[str] = Field(default=None, max_length=2048)
    setup_result_json: Optional[Dict[str, Any]] = Field(default=None, sa_type=sa.JSON)
    health_json: Optional[Dict[str, Any]] = Field(default=None, sa_type=sa.JSON)
    error: Optional[str] = Field(default=None, max_length=2000)
    created_at: datetime = Field(default_factory=datetime.utcnow, index=True)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    expires_at: datetime = Field(index=True)
    used_at: Optional[datetime] = Field(default=None, index=True)
    started_at: Optional[datetime] = Field(default=None)
    completed_at: Optional[datetime] = Field(default=None)
    notification_sent_at: Optional[datetime] = Field(default=None)
