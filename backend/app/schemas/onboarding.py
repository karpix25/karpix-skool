from typing import Optional
import uuid

from pydantic import BaseModel


class TenantOnboardingStatusRead(BaseModel):
    tenant_id: uuid.UUID
    has_school_profile: bool
    has_serving_subscription: bool
    has_telegram_group: bool
    courses_count: int
    published_course_id: Optional[uuid.UUID]
    students_count: int
    has_student_preview: bool
    is_completed: bool
