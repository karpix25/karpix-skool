from datetime import datetime
from typing import Optional
import uuid

from pydantic import BaseModel, Field

from ..models_subscription import SubscriptionLifecycleStatus


class PlanRead(BaseModel):
    id: uuid.UUID
    code: str
    name: str
    max_courses: int
    max_students: int
    max_ai_jobs_per_month: int
    max_storage_bytes: int
    trial_days: int


class SubscriptionRead(BaseModel):
    tenant_id: uuid.UUID
    status: SubscriptionLifecycleStatus
    plan: PlanRead
    current_period_start: datetime
    current_period_end: Optional[datetime]
    trial_ends_at: Optional[datetime]
    is_write_allowed: bool
    is_ai_allowed: bool
    blocking_reason: Optional[str]


class SubscriptionUsageRead(BaseModel):
    courses_used: int = 0
    students_used: int = 0
    ai_jobs_used: int = 0
    storage_bytes_used: int = 0


class SuperSubscriptionRead(SubscriptionRead):
    usage: SubscriptionUsageRead


class SubscriptionUpdate(BaseModel):
    plan_code: Optional[str] = Field(default=None, min_length=1, max_length=40)
    status: Optional[SubscriptionLifecycleStatus] = None
    current_period_end: Optional[datetime] = None
    reason: str = Field(min_length=3, max_length=500)
