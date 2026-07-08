from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional
import uuid

from pydantic import BaseModel, ConfigDict, Field, field_validator

from ..models_course_generation_pipeline import (
    CourseGenerationArtifactStatus,
    CourseGenerationArtifactType,
    CourseGenerationRunStatus,
    CourseGenerationStage,
)


class MediaAssetKind(str, Enum):
    image = "image"
    video = "video"
    document = "document"
    link = "link"


class MediaAssetPayload(BaseModel):
    kind: MediaAssetKind
    title: Optional[str] = Field(default=None, max_length=180)
    url: Optional[str] = Field(default=None, max_length=2048)
    alt_text: Optional[str] = Field(default=None, max_length=500)
    caption: Optional[str] = Field(default=None, max_length=1000)
    provider: Optional[str] = Field(default=None, max_length=80)
    required: bool = False
    metadata: Dict[str, Any] = Field(default_factory=dict)

    @field_validator("title", "url", "alt_text", "caption", "provider")
    @classmethod
    def normalize_optional_text(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        return value.strip() or None

    @field_validator("url")
    @classmethod
    def validate_url(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        if not value.startswith(("http://", "https://")):
            raise ValueError("Media URL must use http or https")
        return value


class LessonBlueprintPayload(BaseModel):
    title: str = Field(min_length=1, max_length=180)
    summary: Optional[str] = Field(default=None, max_length=1200)
    learning_objectives: List[str] = Field(default_factory=list, max_length=12)
    estimated_minutes: Optional[int] = Field(default=None, ge=1, le=240)
    media_requests: List[MediaAssetPayload] = Field(default_factory=list, max_length=12)

    @field_validator("title")
    @classmethod
    def normalize_title(cls, value: str) -> str:
        clean_value = value.strip()
        if not clean_value:
            raise ValueError("Lesson title is required")
        return clean_value

    @field_validator("summary")
    @classmethod
    def normalize_summary(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        return value.strip() or None

    @field_validator("learning_objectives")
    @classmethod
    def normalize_learning_objectives(cls, values: List[str]) -> List[str]:
        return [value.strip() for value in values if value.strip()]


class ModuleBlueprintPayload(BaseModel):
    title: str = Field(min_length=1, max_length=180)
    summary: Optional[str] = Field(default=None, max_length=1200)
    lessons: List[LessonBlueprintPayload] = Field(min_length=1, max_length=48)

    @field_validator("title")
    @classmethod
    def normalize_title(cls, value: str) -> str:
        clean_value = value.strip()
        if not clean_value:
            raise ValueError("Module title is required")
        return clean_value

    @field_validator("summary")
    @classmethod
    def normalize_summary(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        return value.strip() or None


class CourseBlueprintPayload(BaseModel):
    title: str = Field(min_length=1, max_length=180)
    description: Optional[str] = Field(default=None, max_length=4000)
    audience: Optional[str] = Field(default=None, max_length=500)
    learning_outcomes: List[str] = Field(default_factory=list, max_length=24)
    modules: List[ModuleBlueprintPayload] = Field(min_length=1, max_length=24)

    @field_validator("title")
    @classmethod
    def normalize_title(cls, value: str) -> str:
        clean_value = value.strip()
        if not clean_value:
            raise ValueError("Course title is required")
        return clean_value

    @field_validator("description", "audience")
    @classmethod
    def normalize_optional_text(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        return value.strip() or None

    @field_validator("learning_outcomes")
    @classmethod
    def normalize_learning_outcomes(cls, values: List[str]) -> List[str]:
        return [value.strip() for value in values if value.strip()]


class LessonDraftPayload(BaseModel):
    title: str = Field(min_length=1, max_length=180)
    html: str = Field(min_length=1, max_length=30000)
    summary: Optional[str] = Field(default=None, max_length=1200)
    media: List[MediaAssetPayload] = Field(default_factory=list, max_length=24)
    source_refs: List[str] = Field(default_factory=list, max_length=48)

    @field_validator("title", "html")
    @classmethod
    def normalize_required_text(cls, value: str) -> str:
        clean_value = value.strip()
        if not clean_value:
            raise ValueError("Required lesson text is empty")
        return clean_value

    @field_validator("summary")
    @classmethod
    def normalize_summary(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        return value.strip() or None

    @field_validator("source_refs")
    @classmethod
    def normalize_source_refs(cls, values: List[str]) -> List[str]:
        return [value.strip() for value in values if value.strip()]


class CourseGenerationRunRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    tenant_id: uuid.UUID
    course_id: Optional[uuid.UUID]
    created_by_user_id: uuid.UUID
    status: CourseGenerationRunStatus
    current_stage: CourseGenerationStage
    input_json: Optional[Dict[str, Any]]
    checklist_json: Optional[Dict[str, Any]]
    error: Optional[str]
    created_at: datetime
    updated_at: datetime
    started_at: Optional[datetime]
    completed_at: Optional[datetime]


class CourseGenerationArtifactRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    run_id: uuid.UUID
    tenant_id: uuid.UUID
    stage: CourseGenerationStage
    artifact_type: CourseGenerationArtifactType
    status: CourseGenerationArtifactStatus
    resource_type: Optional[str]
    resource_id: Optional[uuid.UUID]
    title: Optional[str]
    payload_json: Optional[Dict[str, Any]]
    review_notes: Optional[str]
    created_at: datetime
    updated_at: datetime
    approved_at: Optional[datetime]
    rejected_at: Optional[datetime]


class PublishChecklistItem(BaseModel):
    key: str = Field(min_length=1, max_length=80)
    label: str = Field(min_length=1, max_length=180)
    passed: bool
    blocking: bool = True
    detail: Optional[str] = Field(default=None, max_length=1000)


class PublishChecklist(BaseModel):
    can_publish: bool
    items: List[PublishChecklistItem] = Field(default_factory=list, max_length=24)
