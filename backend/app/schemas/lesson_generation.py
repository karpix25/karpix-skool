from datetime import datetime
from typing import List, Optional
from urllib.parse import urlparse
import uuid

from pydantic import AliasChoices, BaseModel, ConfigDict, Field, field_validator

from ..models_generation import LessonGenerationJobStatus


class LessonGenerationCreate(BaseModel):
    notebook_url: str = Field(
        min_length=12,
        max_length=2048,
        validation_alias=AliasChoices("notebook_url", "notebooklm_url"),
    )
    lesson_count: int = Field(default=5, ge=1, le=12)
    audience_level: Optional[str] = Field(default=None, max_length=120)
    style: Optional[str] = Field(default=None, max_length=240)

    @field_validator("notebook_url")
    @classmethod
    def validate_notebook_url(cls, value: str) -> str:
        clean_value = value.strip()
        parsed = urlparse(clean_value)
        hostname = (parsed.hostname or "").lower()
        if parsed.scheme != "https" or not hostname.endswith("notebooklm.google.com"):
            raise ValueError("NotebookLM link must be a https://notebooklm.google.com URL")
        return clean_value


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


class GeneratedLessonPayload(BaseModel):
    title: str = Field(min_length=1, max_length=180)
    html: str = Field(min_length=1, max_length=30000)
    icon_emoji: Optional[str] = Field(default=None, max_length=16)


class GeneratedLessonsPayload(BaseModel):
    lessons: List[GeneratedLessonPayload] = Field(min_length=1, max_length=12)
