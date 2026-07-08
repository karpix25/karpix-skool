from datetime import datetime
from typing import List, Optional
import uuid

from pydantic import AliasChoices, BaseModel, ConfigDict, Field, field_validator
from pydantic import model_validator

from ..models_generation import LessonGenerationJobStatus
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
    module_count: int = Field(default=4, ge=1, le=12)
    lessons_per_module: int = Field(default=4, ge=1, le=12)
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
        return LessonGenerationCreate.validate_notebook_url(value)

    @model_validator(mode="after")
    def validate_sources(self):
        if not self.notebook_url and not self.sources:
            raise ValueError("At least one source is required")
        return self


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
    created_at: datetime
    updated_at: datetime
    started_at: Optional[datetime]
    completed_at: Optional[datetime]


class GeneratedLessonPayload(BaseModel):
    title: str = Field(min_length=1, max_length=180)
    html: str = Field(min_length=1, max_length=30000)
    icon_emoji: Optional[str] = Field(default=None, max_length=16)
    media_plan: List[str] = Field(default_factory=list, max_length=8)


class GeneratedLessonsPayload(BaseModel):
    lessons: List[GeneratedLessonPayload] = Field(min_length=1, max_length=12)


class GeneratedCourseModulePayload(BaseModel):
    title: str = Field(min_length=1, max_length=180)
    lessons: List[GeneratedLessonPayload] = Field(min_length=1, max_length=12)


class GeneratedCourseStructurePayload(BaseModel):
    modules: List[GeneratedCourseModulePayload] = Field(min_length=1, max_length=12)
