from datetime import datetime
from typing import Any, Literal, Optional
import uuid

from pydantic import BaseModel, Field


LeaderboardPeriodKey = Literal["week", "month", "all"]


class WebAppLeaderboardEntry(BaseModel):
    rank: int
    user_id: uuid.UUID
    username: str
    avatar_url: Optional[str] = None
    xp_total: int
    xp_period: Optional[int] = None
    level: int
    is_me: bool = False


class WebAppLeaderboardCurrentUser(BaseModel):
    rank: Optional[int] = None
    user_id: uuid.UUID
    username: str
    avatar_url: Optional[str] = None
    xp_total: int
    xp_period: Optional[int] = None
    level: int
    next_level: Optional[int] = None
    xp_to_next_level: int
    progress_percent: float
    is_me: bool = True


class WebAppLeaderboardLevel(BaseModel):
    level: int
    name: Optional[str] = None
    xp_threshold: int
    member_count: int
    member_percent: float
    unlocks: list[Any] = Field(default_factory=list)


class WebAppLeaderboardPeriod(BaseModel):
    key: LeaderboardPeriodKey
    label: str
    starts_at: Optional[datetime] = None
    ends_at: Optional[datetime] = None
    mode: Literal["rolling", "all_time"]


class WebAppLeaderboardSection(BaseModel):
    period: WebAppLeaderboardPeriod
    items: list[WebAppLeaderboardEntry] = Field(default_factory=list)


class WebAppLeaderboardSummaryResponse(BaseModel):
    generated_at: datetime
    last_updated_at: Optional[datetime] = None
    total_participants: int
    current_user: WebAppLeaderboardCurrentUser
    levels: list[WebAppLeaderboardLevel] = Field(default_factory=list)
    leaderboards: dict[LeaderboardPeriodKey, WebAppLeaderboardSection]
