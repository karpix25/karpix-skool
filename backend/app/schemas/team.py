import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field

from ..models import MemberRole, MemberStatus


class TeamMemberRead(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    username: Optional[str]
    telegram_id: Optional[int]
    avatar_url: Optional[str]
    role: MemberRole
    status: MemberStatus
    joined_at: datetime
    xp: int
    level: int


class TeamMemberCreate(BaseModel):
    identifier: str = Field(min_length=1, max_length=80)
    role: MemberRole = MemberRole.admin


class TeamMemberRoleUpdate(BaseModel):
    role: MemberRole
