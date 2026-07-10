from datetime import datetime
from typing import List, Optional
import uuid

from pydantic import AliasChoices, BaseModel, ConfigDict, Field, computed_field, field_validator
from pydantic import model_validator

from ..models_generation import CourseStructureLessonTaskStatus, LessonGenerationJobStatus
from .generation_sources import GenerationSourceInput
from ..services.lesson_generation.source_urls import normalize_required_source_url


class LessonGenerationCreate(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    notebook_url: Optional[str] = Field(
        default=None,
        min_length=12,
        max_length=2048,
        validation_alias=AliasChoices(
            "source_url",
            "open_notebook_url",
            "notebook_url",
        ),
    )
    sources: List[GenerationSourceInput] = Field(default_factory=list, max_length=20)
    lesson_count: int = Field(default=5, ge=1, le=12)
    audience_level: Optional[str] = Field(default=None, max_length=120)
    style: Optional[str] = Field(default=None, max_length=240)
    course_goal: Optional[str] = Field(default=None, max_length=400)
    target_audience: Optional[str] = Field(default=None, max_length=240)
    lesson_format: Optional[str] = Field(default=None, max_length=160)
    depth: Optional[str] = Field(default=None, max_length=160)
    practice_level: Optional[str] = Field(default=None, max_length=160)
    media_strategy: Optional[str] = Field(default=None, max_length=240)
    monetization_strategy: Optional[str] = Field(default=None, max_length=240)

    @field_validator("notebook_url")
    @classmethod
    def validate_notebook_url(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        return normalize_required_source_url(value)

    @model_validator(mode="after")
    def validate_sources(self):
        if not self.notebook_url and not self.sources:
            raise ValueError("At least one source is required")
        return self


class CourseStructureGenerationCreate(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    notebook_url: Optional[str] = Field(
        default=None,
        min_length=12,
        max_length=2048,
        validation_alias=AliasChoices(
            "source_url",
            "open_notebook_url",
            "notebook_url",
        ),
    )
    sources: List[GenerationSourceInput] = Field(default_factory=list, max_length=20)
    module_count: int = Field(default=6, ge=1, le=12)
    lessons_per_module: int = Field(default=6, ge=1, le=12)
    audience_level: Optional[str] = Field(default=None, max_length=120)
    style: Optional[str] = Field(default=None, max_length=240)
    course_goal: Optional[str] = Field(default=None, max_length=400)
    target_audience: Optional[str] = Field(default=None, max_length=240)
    point_a: Optional[str] = Field(default=None, max_length=600)
    point_b: Optional[str] = Field(default=None, max_length=600)
    global_benefit: Optional[str] = Field(default=None, max_length=600)
    author_experience: Optional[str] = Field(default=None, max_length=1500)
    lesson_format: Optional[str] = Field(default=None, max_length=160)
    depth: Optional[str] = Field(default=None, max_length=160)
    practice_level: Optional[str] = Field(default=None, max_length=160)
    media_strategy: Optional[str] = Field(default=None, max_length=240)
    monetization_strategy: Optional[str] = Field(default=None, max_length=240)
    idempotency_key: Optional[str] = Field(default=None, min_length=1, max_length=128)

    @field_validator("notebook_url")
    @classmethod
    def validate_notebook_url(cls, value: Optional[str]) -> Optional[str]:
        return LessonGenerationCreate.validate_notebook_url(value)

    @model_validator(mode="after")
    def validate_sources(self):
        if not self.notebook_url and not self.sources:
            raise ValueError("At least one source is required")
        return self

    @field_validator("idempotency_key")
    @classmethod
    def normalize_idempotency_key(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        normalized = value.strip()
        if not normalized:
            raise ValueError("idempotency_key must not be blank")
        return normalized


class LessonGenerationJobRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    tenant_id: uuid.UUID
    course_id: uuid.UUID
    module_id: uuid.UUID
    created_by_user_id: uuid.UUID
    notebook_url: str
    lesson_count: int
    audience_level: Optional[str]
    style: Optional[str]
    status: LessonGenerationJobStatus
    error: Optional[str]
    created_lesson_count: int
    created_at: datetime
    updated_at: datetime
    started_at: Optional[datetime]
    completed_at: Optional[datetime]


class CourseStructureGenerationJobRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    tenant_id: uuid.UUID
    course_id: uuid.UUID
    created_by_user_id: uuid.UUID
    notebook_url: str
    module_count: int
    lessons_per_module: int
    audience_level: Optional[str]
    style: Optional[str]
    status: LessonGenerationJobStatus
    error: Optional[str]
    created_module_count: int
    created_lesson_count: int
    current_stage: Optional[str]
    planned_lesson_count: int
    ready_lesson_count: int
    failed_lesson_count: int
    source_gap_lesson_count: int
    resume_count: int
    heartbeat_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime
    started_at: Optional[datetime]
    completed_at: Optional[datetime]

    @computed_field
    @property
    def progress(self) -> int:
        if self.planned_lesson_count <= 0:
            return 100 if self.status == LessonGenerationJobStatus.drafts_created else 0
        return min(100, round((self.ready_lesson_count / self.planned_lesson_count) * 100))

    @computed_field
    @property
    def can_resume(self) -> bool:
        resumable_statuses = {
            LessonGenerationJobStatus.partial_drafts,
            LessonGenerationJobStatus.needs_attention,
            LessonGenerationJobStatus.invalid_output,
            LessonGenerationJobStatus.failed,
        }
        return self.status in resumable_statuses


class CourseStructureGenerationResumeRequest(BaseModel):
    include_source_gaps: bool = False


class CourseStructureGenerationResumeResponse(CourseStructureGenerationJobRead):
    resumed_task_count: int
    included_source_gaps: bool


class CourseStructureLessonTaskRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    status: CourseStructureLessonTaskStatus
    lesson_title: Optional[str]
    module_index: int
    lesson_index: int
    order_index: int
    error: Optional[str]
    attempt_count: int
    module_id: Optional[uuid.UUID]
    lesson_id: Optional[uuid.UUID]
    heartbeat_at: Optional[datetime]
    updated_at: datetime


class GeneratedLessonPayload(BaseModel):
    title: str = Field(min_length=1, max_length=180)
    html: str = Field(min_length=1, max_length=30000)
    icon_emoji: Optional[str] = Field(default=None, max_length=16)
    media_plan: List[str] = Field(default_factory=list, max_length=8)
    author_story_hint: Optional[str] = Field(default=None, max_length=2000)
    admin_note: Optional[str] = Field(default=None, max_length=2000)


class GeneratedLessonsPayload(BaseModel):
    lessons: List[GeneratedLessonPayload] = Field(min_length=1, max_length=12)


class GeneratedCourseModulePayload(BaseModel):
    title: str = Field(min_length=1, max_length=180)
    lessons: List[GeneratedLessonPayload] = Field(min_length=1, max_length=12)


class GeneratedCourseStructurePayload(BaseModel):
    modules: List[GeneratedCourseModulePayload] = Field(min_length=1, max_length=12)
