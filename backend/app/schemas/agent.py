from datetime import datetime
from typing import Any, Dict, List, Optional
from urllib.parse import urlparse
import uuid

from pydantic import AliasChoices, BaseModel, ConfigDict, Field, field_validator

from ..models_agent import (
    AgentApprovalStatus,
    AgentApprovalType,
    AgentArtifactType,
    AgentRunStatus,
    AgentStepStatus,
    AgentTaskType,
)


class AgentLessonDraftCreate(BaseModel):
    title: str = Field(min_length=1, max_length=180)
    content: Optional[str] = Field(default=None, max_length=30000)
    cover_url: Optional[str] = Field(default=None, max_length=2048)
    icon_emoji: Optional[str] = Field(default=None, max_length=16)

    @field_validator("title")
    @classmethod
    def normalize_title(cls, value: str) -> str:
        clean_value = value.strip()
        if not clean_value:
            raise ValueError("Lesson title is required")
        return clean_value

    @field_validator("content", "cover_url", "icon_emoji")
    @classmethod
    def normalize_optional_lesson_text(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        return value.strip() or None


class AgentModuleDraftCreate(BaseModel):
    title: str = Field(min_length=1, max_length=180)
    lessons: List[AgentLessonDraftCreate] = Field(default_factory=list, max_length=48)

    @field_validator("title")
    @classmethod
    def normalize_title(cls, value: str) -> str:
        clean_value = value.strip()
        if not clean_value:
            raise ValueError("Module title is required")
        return clean_value


class AgentRunCreate(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    task_type: AgentTaskType = AgentTaskType.create_course_draft
    tenant_id: uuid.UUID
    course_title: str = Field(
        min_length=1,
        max_length=180,
        validation_alias=AliasChoices("course_title", "title"),
    )
    description: Optional[str] = Field(default=None, max_length=2000)
    cover_url: Optional[str] = Field(default=None, max_length=2048)
    is_vip: bool = False
    modules: List[AgentModuleDraftCreate] = Field(default_factory=list, max_length=24)
    notebook_url: Optional[str] = Field(
        default=None,
        max_length=2048,
        validation_alias=AliasChoices("notebook_url", "notebooklm_url"),
    )
    module_count: int = Field(default=4, ge=1, le=12)
    lessons_per_module: int = Field(default=4, ge=1, le=12)
    style: Optional[str] = Field(default=None, max_length=240)
    audience_level: Optional[str] = Field(default=None, max_length=120)

    @field_validator("task_type")
    @classmethod
    def validate_task_type(cls, value: AgentTaskType) -> AgentTaskType:
        if value != AgentTaskType.create_course_draft:
            raise ValueError("Only create_course_draft is supported")
        return value

    @field_validator("course_title")
    @classmethod
    def normalize_course_title(cls, value: str) -> str:
        clean_value = value.strip()
        if not clean_value:
            raise ValueError("Course title is required")
        return clean_value

    @field_validator("description", "cover_url", "style", "audience_level")
    @classmethod
    def normalize_optional_text(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        return value.strip() or None

    @field_validator("notebook_url", mode="before")
    @classmethod
    def validate_notebook_url(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None

        clean_value = str(value).strip()
        if not clean_value:
            return None

        parsed = urlparse(clean_value)
        hostname = (parsed.hostname or "").lower()
        if parsed.scheme != "https" or not _is_notebooklm_hostname(hostname):
            raise ValueError("NotebookLM link must be a https://notebooklm.google.com URL")
        return clean_value


class AgentApprovalDecisionCreate(BaseModel):
    note: Optional[str] = Field(default=None, max_length=2000)

    @field_validator("note")
    @classmethod
    def normalize_note(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        return value.strip() or None


class AgentPublishCreate(BaseModel):
    notify_subscribers: bool = False
    note: Optional[str] = Field(default=None, max_length=2000)

    @field_validator("note")
    @classmethod
    def normalize_note(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        return value.strip() or None


class AgentStepRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    run_id: uuid.UUID
    tenant_id: uuid.UUID
    sequence: int
    name: str
    status: AgentStepStatus
    input_json: Optional[Dict[str, Any]]
    output_json: Optional[Dict[str, Any]]
    error: Optional[str]
    created_at: datetime
    updated_at: datetime
    completed_at: Optional[datetime]


class AgentArtifactRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    run_id: uuid.UUID
    step_id: Optional[uuid.UUID]
    tenant_id: uuid.UUID
    artifact_type: AgentArtifactType
    resource_type: str
    resource_id: uuid.UUID
    title: Optional[str]
    payload_json: Optional[Dict[str, Any]]
    created_at: datetime


class AgentApprovalRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    run_id: uuid.UUID
    tenant_id: uuid.UUID
    requested_by_user_id: uuid.UUID
    approval_type: AgentApprovalType
    status: AgentApprovalStatus
    target_artifact_id: Optional[uuid.UUID]
    request_json: Optional[Dict[str, Any]]
    response_json: Optional[Dict[str, Any]]
    created_at: datetime
    updated_at: datetime
    decided_at: Optional[datetime]
    decided_by_user_id: Optional[uuid.UUID]


class AgentRunRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    tenant_id: uuid.UUID
    created_by_user_id: uuid.UUID
    task_type: AgentTaskType
    status: AgentRunStatus
    approval_status: AgentApprovalStatus
    input_json: Optional[Dict[str, Any]]
    error: Optional[str]
    created_at: datetime
    updated_at: datetime
    completed_at: Optional[datetime]
    steps: List[AgentStepRead] = Field(default_factory=list)
    artifacts: List[AgentArtifactRead] = Field(default_factory=list)
    approvals: List[AgentApprovalRead] = Field(default_factory=list)


class AgentPublishResult(BaseModel):
    run: AgentRunRead
    course_id: uuid.UUID
    published_lessons_count: int
    notification_deliveries_count: int


def _is_notebooklm_hostname(hostname: str) -> bool:
    return hostname == "notebooklm.google.com" or hostname.endswith(".notebooklm.google.com")
