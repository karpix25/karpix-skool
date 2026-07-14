from typing import Optional
import uuid

from pydantic import BaseModel, Field


class TenantCreate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = Field(default=None, max_length=2000)
    logo_url: Optional[str] = None
    accent_color: Optional[str] = None
    support_url: Optional[str] = None
    level_names: Optional[dict] = None
    free_group_link: Optional[str] = None
    vip_group_link: Optional[str] = None
    welcome_video_enabled: Optional[bool] = None
    welcome_video_url: Optional[str] = None
    welcome_video_title: Optional[str] = None
    welcome_video_description: Optional[str] = None


class TenantRead(BaseModel):
    id: uuid.UUID
    name: str
    description: Optional[str] = None
    logo_url: Optional[str] = None
    accent_color: Optional[str] = None
    support_url: Optional[str] = None
    setup_code: Optional[str] = None
    setup_code_masked: bool = False
    telegram_group_id: Optional[int] = None
    telegram_group_id_vip: Optional[int] = None
    subscription_status: str = "active"
    member_count: int = 0
    course_count: int = 0
    level_names: Optional[dict] = None
    free_group_link: Optional[str] = None
    vip_group_link: Optional[str] = None
    welcome_video_enabled: bool = False
    welcome_video_url: Optional[str] = None
    welcome_video_title: Optional[str] = None
    welcome_video_description: Optional[str] = None
