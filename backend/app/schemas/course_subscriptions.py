from datetime import datetime
import uuid

from pydantic import BaseModel


class CourseSubscriptionRead(BaseModel):
    course_id: uuid.UUID
    is_subscribed: bool
    updated_at: datetime | None = None
