from typing import List, Optional
import uuid

from pydantic import BaseModel

from ..models import CourseUnlockType, UnlockType, VideoProvider


class CourseCreate(BaseModel):
    title: str
    description: Optional[str] = None
    cover_url: Optional[str] = None
    unlock_value: Optional[str] = None
    is_published: bool = False
    is_vip: bool = False
    unlock_type: CourseUnlockType = CourseUnlockType.open


class CourseUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    cover_url: Optional[str] = None
    unlock_value: Optional[str] = None
    is_published: Optional[bool] = None
    is_vip: Optional[bool] = None
    unlock_type: Optional[CourseUnlockType] = None


class CourseRead(BaseModel):
    id: uuid.UUID
    title: str
    description: Optional[str]
    cover_url: Optional[str]
    unlock_value: Optional[str]
    is_published: bool
    is_vip: bool
    unlock_type: CourseUnlockType
    open_notebook_id: Optional[str] = None
    progress_percent: int = 0
    lessons_count: int = 0
    order_index: int = 0
    tenant_id: uuid.UUID


class CourseAnnounce(BaseModel):
    message: str


class ModuleCreate(BaseModel):
    title: str
    unlock_value: Optional[str] = None
    order_index: int = 0
    is_vip: bool = False
    unlock_type: UnlockType = UnlockType.immediate


class ModuleUpdate(BaseModel):
    title: Optional[str] = None
    unlock_value: Optional[str] = None
    order_index: Optional[int] = None
    is_vip: Optional[bool] = None
    unlock_type: Optional[UnlockType] = None


class ModuleRead(BaseModel):
    id: uuid.UUID
    title: str
    unlock_value: Optional[str]
    order_index: int
    is_vip: bool
    unlock_type: UnlockType


class LessonCreate(BaseModel):
    title: str
    video_provider: Optional[VideoProvider] = None
    video_id: Optional[str] = None
    content: Optional[str] = None
    cover_url: Optional[str] = None
    icon_emoji: Optional[str] = None
    order_index: int = 0
    is_published: bool = False
    is_vip: bool = False
    unlock_type: UnlockType = UnlockType.immediate
    unlock_value: Optional[str] = None


class LessonUpdate(BaseModel):
    title: Optional[str] = None
    video_provider: Optional[VideoProvider] = None
    video_id: Optional[str] = None
    content: Optional[str] = None
    cover_url: Optional[str] = None
    icon_emoji: Optional[str] = None
    order_index: Optional[int] = None
    is_published: Optional[bool] = None
    is_vip: Optional[bool] = None
    unlock_type: Optional[UnlockType] = None
    unlock_value: Optional[str] = None
    module_id: Optional[uuid.UUID] = None
    mux_asset_id: Optional[str] = None
    mux_playback_id: Optional[str] = None
    mux_status: Optional[str] = None


class LessonRead(BaseModel):
    id: uuid.UUID
    title: str
    video_provider: Optional[VideoProvider] = None
    video_id: Optional[str] = None
    content: Optional[str]
    cover_url: Optional[str] = None
    icon_emoji: Optional[str] = None
    order_index: int
    is_published: bool
    is_vip: bool
    unlock_type: UnlockType
    unlock_value: Optional[str]
    module_id: uuid.UUID
    mux_asset_id: Optional[str] = None
    mux_playback_id: Optional[str] = None
    mux_status: Optional[str] = None


class ModuleDetailRead(ModuleRead):
    lessons: List[LessonRead]


class CourseDetailRead(BaseModel):
    course: CourseRead
    modules: List[ModuleDetailRead]


class BulkReorderItem(BaseModel):
    id: uuid.UUID
    order_index: int
