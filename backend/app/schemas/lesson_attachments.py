from datetime import datetime
import uuid

from pydantic import BaseModel, ConfigDict


class LessonAttachmentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    tenant_id: uuid.UUID
    lesson_id: uuid.UUID
    filename: str
    content_type: str
    size_bytes: int
    display_order: int
    created_at: datetime
