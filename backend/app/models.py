from datetime import datetime
from sqlmodel import SQLModel, Field, Relationship
from sqlalchemy import BigInteger, UniqueConstraint
import sqlalchemy as sa
import uuid
from enum import Enum
from typing import Optional, List, Dict, Any

class SubscriptionStatus(str, Enum):
    active = "active"
    past_due = "past_due"

class MemberRole(str, Enum):
    student = "student"
    admin = "admin"
    moderator = "moderator"
    owner = "owner"

class MemberStatus(str, Enum):
    active = "active"
    paused = "paused"

class UserAdminStatus(str, Enum):
    none = "none"
    pending = "pending"
    approved = "approved"
    rejected = "rejected"

class UnlockType(str, Enum):
    immediate = "immediate"
    level_based = "level_based"
    time_relative = "time_relative"
    time_fixed = "time_fixed"

class VideoProvider(str, Enum):
    youtube_unlisted = "youtube_unlisted"
    mux = "mux"
    vimeo = "vimeo"

class CourseUnlockType(str, Enum):
    open = "open"
    level_based = "level_based"
    time_relative = "time_relative"
    private = "private"

# --- Models ---

class User(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    telegram_id: Optional[int] = Field(default=None, index=True, unique=True, sa_type=BigInteger) 
    email: Optional[str] = Field(default=None, index=True)
    password_hash: Optional[str] = None
    avatar_url: Optional[str] = None
    username: Optional[str] = Field(default=None, index=True)
    is_super_admin: bool = Field(default=False)
    admin_status: UserAdminStatus = Field(default=UserAdminStatus.none)
    admin_request_details: Optional[Dict[str, Any]] = Field(default=None, sa_type=sa.JSON) 
    is_blocked: bool = Field(default=False)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    deleted_at: Optional[datetime] = Field(default=None, index=True)
    
    # Relationships
    owned_tenants: List["Tenant"] = Relationship(back_populates="owner")
    memberships: List["TenantMember"] = Relationship(
        back_populates="user",
        sa_relationship_kwargs={"cascade": "all, delete"}
    )


class Tenant(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    name: str
    owner_user_id: Optional[uuid.UUID] = Field(default=None, foreign_key="user.id", nullable=True, index=True)
    telegram_group_id: Optional[int] = Field(default=None, sa_type=BigInteger)
    telegram_group_id_vip: Optional[int] = Field(default=None, sa_type=BigInteger)
    vip_group_link: Optional[str] = None
    bot_token_override: Optional[str] = None
    subscription_status: SubscriptionStatus = Field(default=SubscriptionStatus.active)
    setup_code: Optional[str] = Field(default=None, index=True, unique=True)
    expires_at: Optional[datetime] = Field(default=None)
    level_names: Optional[Dict[str, str]] = Field(default=None, sa_type=sa.JSON)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    deleted_at: Optional[datetime] = Field(default=None, index=True)
    
    # Relationships
    owner: Optional["User"] = Relationship(back_populates="owned_tenants")
    members: List["TenantMember"] = Relationship(
        back_populates="tenant",
        sa_relationship_kwargs={"cascade": "all, delete"}
    )
    courses: List["Course"] = Relationship(
        back_populates="tenant",
        sa_relationship_kwargs={"cascade": "all, delete"}
    )


class TenantMember(SQLModel, table=True):
    __table_args__ = (
        UniqueConstraint("tenant_id", "user_id", name="uq_tenant_user"),
        sa.Index("ix_tenantmember_leaderboard", "tenant_id", sa.text("xp DESC"), sa.text("level DESC")),
        sa.Index("ix_tenantmember_joins", "tenant_id", "joined_at"),
    )

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    tenant_id: uuid.UUID = Field(foreign_key="tenant.id", index=True)
    user_id: uuid.UUID = Field(foreign_key="user.id", index=True)
    role: MemberRole = Field(default=MemberRole.student, index=True)
    joined_at: datetime = Field(default_factory=datetime.utcnow, index=True)
    status: MemberStatus = Field(default=MemberStatus.active, index=True)
    paused_at: Optional[datetime] = Field(default=None)
    xp: int = Field(default=0)
    level: int = Field(default=1)
    
    # Anti-spam for social XP
    hourly_xp_count: int = Field(default=0)
    last_xp_at: Optional[datetime] = Field(default=None)
    
    cohort_start_date: datetime = Field(default_factory=datetime.utcnow)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    deleted_at: Optional[datetime] = Field(default=None, index=True)

    # Relationships
    tenant: Tenant = Relationship(back_populates="members")
    user: User = Relationship(back_populates="memberships")


class Course(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    tenant_id: uuid.UUID = Field(foreign_key="tenant.id", index=True)
    title: str
    description: Optional[str] = None
    cover_url: Optional[str] = None
    unlock_type: CourseUnlockType = Field(default=CourseUnlockType.open)
    unlock_value: Optional[str] = None
    is_published: bool = Field(default=False, index=True)
    is_vip: bool = Field(default=False, index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    deleted_at: Optional[datetime] = Field(default=None, index=True)
    
    # Relationships
    tenant: Tenant = Relationship(back_populates="courses")
    modules: List["Module"] = Relationship(
        back_populates="course",
        sa_relationship_kwargs={"cascade": "all, delete"}
    )


class Module(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    course_id: uuid.UUID = Field(foreign_key="course.id", index=True)
    title: str 
    unlock_type: Optional[UnlockType] = Field(default=UnlockType.immediate, nullable=True)
    unlock_value: Optional[str] = Field(default=None, nullable=True)
    order_index: int = Field(default=0, index=True)
    is_vip: bool = Field(default=False, index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    deleted_at: Optional[datetime] = Field(default=None, index=True)
    
    # Relationships
    course: Course = Relationship(back_populates="modules")
    lessons: List["Lesson"] = Relationship(
        back_populates="module",
        sa_relationship_kwargs={"cascade": "all, delete"}
    )


class Lesson(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    module_id: uuid.UUID = Field(foreign_key="module.id", index=True)
    title: str
    video_provider: Optional[VideoProvider] = Field(default=None, nullable=True)
    video_id: Optional[str] = Field(default=None, nullable=True)
    content: Optional[str] = Field(default=None, nullable=True)
    unlock_value: Optional[str] = Field(default=None, nullable=True)
    order_index: int = Field(default=0, index=True)
    is_published: bool = Field(default=False, index=True)
    is_vip: bool = Field(default=False, index=True)
    unlock_type: Optional[UnlockType] = Field(default=UnlockType.immediate, nullable=True)
    
    # Mux Integration
    mux_upload_id: Optional[str] = Field(default=None, nullable=True)
    mux_asset_id: Optional[str] = Field(default=None, nullable=True)
    mux_playback_id: Optional[str] = Field(default=None, nullable=True)
    mux_status: Optional[str] = Field(default=None, nullable=True)

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    deleted_at: Optional[datetime] = Field(default=None, index=True)
    
    # Relationships
    module: Module = Relationship(back_populates="lessons")
    progress: List["LessonProgress"] = Relationship(
        back_populates="lesson",
        sa_relationship_kwargs={"cascade": "all, delete"}
    )


class LessonProgress(SQLModel, table=True):
    __table_args__ = (
        sa.Index("ix_lessonprogress_user_recent", "user_id", sa.text("completed_at DESC")),
    )
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="user.id", index=True)
    lesson_id: uuid.UUID = Field(foreign_key="lesson.id", index=True)
    completed_at: datetime = Field(default_factory=datetime.utcnow, index=True)

# --- Service / Utility Models ---

class MessageStore(SQLModel, table=True):
    """
    Stores mapping of Telegram message IDs to internal User IDs.
    Used to award XP to authors when someone reacts to their message.
    """
    __table_args__ = (
        UniqueConstraint("chat_id", "message_id", name="uq_chat_message"),
        sa.Index("ix_messagestore_lookup", "chat_id", "message_id"),
    )
    
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    message_id: int = Field(sa_type=BigInteger)
    chat_id: int = Field(sa_type=BigInteger)
    user_id: uuid.UUID = Field(foreign_key="user.id", index=True)
    tenant_id: uuid.UUID = Field(foreign_key="tenant.id", index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow, index=True)



