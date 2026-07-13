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

class PlatformLeadStatus(str, Enum):
    new = "new"
    in_progress = "in_progress"
    approved = "approved"
    rejected = "rejected"
    archived = "archived"

class TenantSetupScope(str, Enum):
    owner_invite = "owner_invite"
    free_group_link = "free_group_link"
    vip_group_link = "vip_group_link"

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


class CourseNotificationEventType(str, Enum):
    lesson_published = "lesson_published"
    module_published = "module_published"


class CourseNotificationDeliveryStatus(str, Enum):
    pending = "pending"
    sent = "sent"
    skipped = "skipped"
    failed = "failed"

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
    is_onboarded: bool = Field(default=False)
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
    owner_user_id: Optional[uuid.UUID] = Field(
        default=None, foreign_key="user.id", nullable=True, index=True,
        sa_column_kwargs={"info": {"ondelete": "SET NULL"}}
    )
    telegram_group_id: Optional[int] = Field(default=None, sa_type=BigInteger)
    telegram_topic_id: Optional[int] = Field(default=None, sa_type=BigInteger)
    telegram_group_id_vip: Optional[int] = Field(default=None, sa_type=BigInteger)
    telegram_topic_id_vip: Optional[int] = Field(default=None, sa_type=BigInteger)
    free_group_link: Optional[str] = None
    vip_group_link: Optional[str] = None
    welcome_video_enabled: bool = Field(default=False, nullable=False)
    welcome_video_url: Optional[str] = None
    welcome_video_title: Optional[str] = None
    welcome_video_description: Optional[str] = None
    bot_token_override: Optional[str] = None
    subscription_status: SubscriptionStatus = Field(default=SubscriptionStatus.active)
    setup_code: Optional[str] = Field(default=None, index=True, unique=True)
    expires_at: Optional[datetime] = Field(default=None)
    level_names: Optional[Dict[str, str]] = Field(default=None, sa_type=sa.JSON)
    last_sync_at: Optional[datetime] = Field(default=None)
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
    is_onboarded: bool = Field(default=False)
    
    cohort_start_date: datetime = Field(default_factory=datetime.utcnow)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    deleted_at: Optional[datetime] = Field(default=None, index=True)

    # Relationships
    tenant: Tenant = Relationship(back_populates="members")
    user: User = Relationship(back_populates="memberships")


class TenantSetupToken(SQLModel, table=True):
    __table_args__ = (
        UniqueConstraint("token_hash", name="uq_tenantsetuptoken_token_hash"),
        sa.Index("ix_tenantsetuptoken_tenant_scope_state", "tenant_id", "scope", "used_at", "expires_at"),
    )

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    tenant_id: uuid.UUID = Field(foreign_key="tenant.id", index=True)
    token_hash: str = Field(index=True, max_length=64)
    scope: TenantSetupScope = Field(index=True)
    expires_at: datetime = Field(index=True)
    used_at: Optional[datetime] = Field(default=None, index=True)
    created_by_user_id: Optional[uuid.UUID] = Field(default=None, foreign_key="user.id", nullable=True, index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class PlatformLead(SQLModel, table=True):
    __table_args__ = (
        sa.Index("ix_platformlead_status_created_at", "status", sa.text("created_at DESC")),
    )

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    name: str = Field(max_length=120)
    telegram: str = Field(max_length=80, index=True)
    school_name: str = Field(max_length=160, index=True)
    description: str = Field(max_length=2000)
    status: PlatformLeadStatus = Field(default=PlatformLeadStatus.new, index=True)
    admin_note: Optional[str] = Field(default=None, max_length=2000)
    handled_by_user_id: Optional[uuid.UUID] = Field(default=None, foreign_key="user.id", index=True)
    handled_at: Optional[datetime] = Field(default=None)
    created_at: datetime = Field(default_factory=datetime.utcnow, index=True)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    deleted_at: Optional[datetime] = Field(default=None, index=True)


class SuperActivityEvent(SQLModel, table=True):
    __table_args__ = (
        sa.Index("ix_superactivityevent_occurred_at", sa.text("occurred_at DESC")),
        sa.Index("ix_superactivityevent_tenant_occurred_at", "tenant_id", sa.text("occurred_at DESC")),
        sa.Index("ix_superactivityevent_type_occurred_at", "event_type", sa.text("occurred_at DESC")),
    )

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    event_type: str = Field(max_length=80, index=True)
    tone: str = Field(default="info", max_length=20)
    occurred_at: datetime = Field(default_factory=datetime.utcnow)
    actor_user_id: Optional[uuid.UUID] = Field(default=None, foreign_key="user.id", nullable=True, index=True)
    tenant_id: Optional[uuid.UUID] = Field(default=None, foreign_key="tenant.id", nullable=True, index=True)
    target_type: Optional[str] = Field(default=None, max_length=80)
    target_id: Optional[str] = Field(default=None, max_length=120, index=True)
    title: str = Field(max_length=180)
    message: str = Field(max_length=1000)
    meta: Optional[Dict[str, Any]] = Field(
        default=None,
        sa_column=sa.Column("metadata", sa.JSON(), nullable=True),
    )
    dedupe_key: Optional[str] = Field(default=None, max_length=255, index=True, unique=True)
    created_at: datetime = Field(default_factory=datetime.utcnow, index=True)


class Course(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    tenant_id: uuid.UUID = Field(foreign_key="tenant.id", index=True)  # FK ON DELETE CASCADE at DB level
    title: str
    description: Optional[str] = None
    cover_url: Optional[str] = None
    unlock_type: CourseUnlockType = Field(default=CourseUnlockType.open)
    unlock_value: Optional[str] = None
    open_notebook_id: Optional[str] = Field(default=None, max_length=255, index=True)
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


class CourseSubscription(SQLModel, table=True):
    __table_args__ = (
        UniqueConstraint("user_id", "course_id", name="uq_coursesubscription_user_course"),
        sa.Index("ix_coursesubscription_course_active", "course_id", "is_active"),
        sa.Index("ix_coursesubscription_tenant_user", "tenant_id", "user_id"),
    )

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    tenant_id: uuid.UUID = Field(foreign_key="tenant.id", index=True)
    course_id: uuid.UUID = Field(foreign_key="course.id", index=True)
    user_id: uuid.UUID = Field(foreign_key="user.id", index=True)
    is_active: bool = Field(default=True, index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow, index=True)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class Module(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    course_id: uuid.UUID = Field(foreign_key="course.id")  # index via ix_module_order_course composite
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
    module_id: uuid.UUID = Field(foreign_key="module.id")  # index via ix_lesson_order_module composite
    title: str
    video_provider: Optional[VideoProvider] = Field(default=None, nullable=True)
    video_id: Optional[str] = Field(default=None, nullable=True)
    content: Optional[str] = Field(default=None, nullable=True)
    cover_url: Optional[str] = Field(default=None, nullable=True)
    icon_emoji: Optional[str] = Field(default=None, nullable=True)
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
    attachments: List["LessonAttachment"] = Relationship(
        back_populates="lesson",
        sa_relationship_kwargs={"cascade": "all, delete"}
    )


class LessonAttachment(SQLModel, table=True):
    __table_args__ = (
        sa.Index("ix_lessonattachment_lesson_order", "lesson_id", "display_order"),
        sa.Index("ix_lessonattachment_tenant_lesson", "tenant_id", "lesson_id"),
    )

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    tenant_id: uuid.UUID = Field(foreign_key="tenant.id", index=True)
    lesson_id: uuid.UUID = Field(foreign_key="lesson.id", index=True)
    filename: str = Field(max_length=255)
    content_type: str = Field(max_length=255)
    size_bytes: int = Field(sa_column=sa.Column(sa.BigInteger(), nullable=False))
    storage_key: str = Field(max_length=1024, index=True)
    display_order: int = Field(default=0, index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow, index=True)
    deleted_at: Optional[datetime] = Field(default=None, index=True)

    lesson: "Lesson" = Relationship(back_populates="attachments")


class CourseNotificationDelivery(SQLModel, table=True):
    __table_args__ = (
        UniqueConstraint("idempotency_key", name="uq_coursenotificationdelivery_key"),
        sa.Index("ix_coursenotificationdelivery_course_event", "course_id", "event_type"),
        sa.Index("ix_coursenotificationdelivery_user_status", "user_id", "status"),
    )

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    tenant_id: uuid.UUID = Field(foreign_key="tenant.id", index=True)
    course_id: uuid.UUID = Field(foreign_key="course.id", index=True)
    user_id: uuid.UUID = Field(foreign_key="user.id", index=True)
    event_type: CourseNotificationEventType = Field(index=True)
    idempotency_key: str = Field(max_length=255, index=True)
    module_id: Optional[uuid.UUID] = Field(default=None, foreign_key="module.id", nullable=True, index=True)
    lesson_id: Optional[uuid.UUID] = Field(default=None, foreign_key="lesson.id", nullable=True, index=True)
    status: CourseNotificationDeliveryStatus = Field(
        default=CourseNotificationDeliveryStatus.pending,
        index=True,
    )
    error: Optional[str] = Field(default=None, max_length=1000)
    created_at: datetime = Field(default_factory=datetime.utcnow, index=True)
    sent_at: Optional[datetime] = Field(default=None, index=True)


class LessonProgress(SQLModel, table=True):
    __table_args__ = (
        UniqueConstraint("user_id", "lesson_id", name="uq_user_lesson"),
        sa.Index("ix_lessonprogress_user_recent", "user_id", sa.text("completed_at DESC")),
    )
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="user.id", index=True)
    lesson_id: uuid.UUID = Field(foreign_key="lesson.id", index=True)
    completed_at: datetime = Field(default_factory=datetime.utcnow, index=True)

    # Relationships
    lesson: "Lesson" = Relationship(back_populates="progress")

# --- Service / Utility Models ---


class XPEvent(SQLModel, table=True):
    __table_args__ = (
        UniqueConstraint("idempotency_key", name="uq_xpevent_idempotency_key"),
        sa.Index("ix_xpevent_tenant_user_created_at", "tenant_id", "user_id", "created_at"),
        sa.Index("ix_xpevent_source", "source_type", "source_id"),
    )

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    tenant_id: uuid.UUID = Field(foreign_key="tenant.id")
    user_id: uuid.UUID = Field(foreign_key="user.id")
    source_type: str = Field(max_length=50)
    source_id: str = Field(max_length=255)
    points: int
    created_at: datetime = Field(default_factory=datetime.utcnow)
    idempotency_key: str = Field(max_length=255)


class MessageStore(SQLModel, table=True):
    """
    Stores mapping of Telegram message IDs to internal User IDs.
    Used to award XP to authors when someone reacts to their message.
    """
    __table_args__ = (
        UniqueConstraint("chat_id", "message_id", name="uq_chat_message"),
        # ix_messagestore_lookup removed — redundant with uq_chat_message
    )
    
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    message_id: int = Field(sa_type=BigInteger)
    chat_id: int = Field(sa_type=BigInteger)
    user_id: uuid.UUID = Field(foreign_key="user.id", index=True)
    tenant_id: uuid.UUID = Field(foreign_key="tenant.id", index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow, index=True)


class OneTimeToken(SQLModel, table=True):
    """
    Temporary tokens for desktop login via magic links.
    """
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="user.id", index=True)
    token_hash: str = Field(index=True, unique=True, max_length=64)
    expires_at: datetime = Field(index=True)
    used_at: Optional[datetime] = Field(default=None)
    created_at: datetime = Field(default_factory=datetime.utcnow)


from . import models_quizzes as models_quizzes  # noqa: E402,F401
