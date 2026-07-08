from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field, model_validator

from ..services.lesson_generation.open_notebook_sources import extract_open_notebook_id
from ..services.lesson_generation.source_urls import normalize_source_url


class GenerationSourceKind(str, Enum):
    link = "link"
    youtube = "youtube"
    instagram = "instagram"
    tiktok = "tiktok"
    open_notebook = "open_notebook"
    note = "note"
    file = "file"


class GenerationSourceInput(BaseModel):
    kind: GenerationSourceKind
    title: Optional[str] = Field(default=None, max_length=180)
    url: Optional[str] = Field(default=None, max_length=2048)
    content: Optional[str] = Field(default=None, max_length=250_000)
    content_type: Optional[str] = Field(default=None, max_length=120)
    size_bytes: Optional[int] = Field(default=None, ge=0)

    @model_validator(mode="after")
    def validate_payload(self):
        if self.kind == GenerationSourceKind.open_notebook:
            notebook_id = extract_open_notebook_id(self.content or self.url)
            if not notebook_id:
                raise ValueError("Open Notebook source link or id is required")
            self.content = notebook_id
            if self.url:
                self.url = self.url.strip()
            if not self.title:
                self.title = notebook_id
            return self

        if self.kind == GenerationSourceKind.note:
            if not self.content or not self.content.strip():
                raise ValueError("Note source content is required")
            self.content = self.content.strip()
            return self

        self.url = normalize_source_url(self.url)
        if not self.url:
            raise ValueError("Source URL is required")
        return self


class GenerationSourceUploadRead(BaseModel):
    source: GenerationSourceInput
