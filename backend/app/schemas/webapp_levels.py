from typing import List, Literal, Optional
import uuid

from pydantic import BaseModel, Field


class WebAppLevelUnlock(BaseModel):
    target_type: Literal["course", "module", "lesson"]
    tenant_id: uuid.UUID
    course_id: uuid.UUID
    module_id: Optional[uuid.UUID] = None
    lesson_id: Optional[uuid.UUID] = None
    title: str
    course_title: Optional[str] = None
    module_title: Optional[str] = None
    required_level: int
    xp_threshold: int
    is_vip: bool = False
    order_index: int = 0


class WebAppLevelMilestone(BaseModel):
    level: int
    xp_threshold: int
    unlocks: List[WebAppLevelUnlock] = Field(default_factory=list)


class WebAppLevelMembership(BaseModel):
    tenant_id: uuid.UUID
    xp: int
    level: int


class WebAppXpSource(BaseModel):
    source_type: Literal["lesson", "quiz_question", "message", "reaction"]
    title: str
    description: str
    points: int
    limit: Optional[str] = None


class WebAppLevelsResponse(BaseModel):
    milestones: List[WebAppLevelMilestone]
    memberships: List[WebAppLevelMembership]
    xp_sources: List[WebAppXpSource] = Field(default_factory=list)
