from datetime import datetime
from typing import Optional
import uuid

from pydantic import BaseModel, ConfigDict, Field

from ..models import PlatformLeadStatus


class LeadApply(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    telegram: str = Field(min_length=1, max_length=80)
    schoolName: str = Field(min_length=1, max_length=160)
    description: str = Field(min_length=1, max_length=2000)


class PlatformLeadRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    telegram: str
    school_name: str
    description: str
    status: PlatformLeadStatus
    admin_note: Optional[str] = None
    handled_by_user_id: Optional[uuid.UUID] = None
    handled_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime


class PlatformLeadUpdate(BaseModel):
    status: Optional[PlatformLeadStatus] = None
    admin_note: Optional[str] = Field(default=None, max_length=2000)


class LeadApplyResponse(BaseModel):
    status: str
    message: str
    id: uuid.UUID
