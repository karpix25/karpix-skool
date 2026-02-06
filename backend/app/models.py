from datetime import datetime
from sqlmodel import SQLModel, Field, Relationship
from sqlalchemy import BigInteger, UniqueConstraint
import uuid
from enum import Enum
from typing import Optional, List
class SubscriptionStatus(str, Enum):
    active = "active"
    past_due = "past_due"

class MemberRole(str, Enum):
    student = "student"
    admin = "admin"
    moderator = "moderator"

class MemberStatus(str, Enum):
    active = "active"
    paused = "paused"

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
    payment_based = "payment_based"
    time_relative = "time_relative"
    private = "private"

# --- Models ---

class User(SQLModel, table=True):
    """
    Global Profile
    """
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    telegram_id: Optional[int] = Field(default=None, index=True, unique=True, sa_type=BigInteger) 
    email: Optional[str] = Field(default=None, index=True)
    password_hash: Optional[str] = None
    username: Optional[str] = None
    avatar_url: Optional[str] = None
    is_super_admin: bool = Field(default=False)
    
    # Relationships
    owned_tenants: List["Tenant"] = Relationship(back_populates="owner")
    memberships: List["TenantMember"] = Relationship(
        back_populates="user",
        sa_relationship_kwargs={"cascade": "all, delete"}
    )


class Tenant(SQLModel, table=True):
    """
    School / Community
    """
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    name: str
    owner_user_id: Optional[uuid.UUID] = Field(default=None, foreign_key="user.id", nullable=True)
    telegram_group_id: Optional[int] = Field(default=None, sa_type=BigInteger) # Can be None initially
    bot_token_override: Optional[str] = None
    subscription_status: SubscriptionStatus = Field(default=SubscriptionStatus.active)
    setup_code: Optional[str] = Field(default=None, index=True, unique=True)
    
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
    """
    Student in a School
    """
    __table_args__ = (UniqueConstraint("tenant_id", "user_id", name="uq_tenant_user"),)

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    tenant_id: uuid.UUID = Field(foreign_key="tenant.id")
    user_id: uuid.UUID = Field(foreign_key="user.id")
    role: MemberRole = Field(default=MemberRole.student)
    joined_at: datetime = Field(default_factory=datetime.utcnow)
    status: MemberStatus = Field(default=MemberStatus.active)
    paused_at: Optional[datetime] = Field(default=None)
    
    # Gamification
    xp: int = Field(default=0)
    level: int = Field(default=1)
    
    # Drip Tracking
    cohort_start_date: datetime = Field(default_factory=datetime.utcnow)

    # Relationships
    tenant: Tenant = Relationship(back_populates="members")
    user: User = Relationship(back_populates="memberships")


class Course(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    tenant_id: uuid.UUID = Field(foreign_key="tenant.id")
    title: str
    description: Optional[str] = None
    cover_url: Optional[str] = None
    unlock_type: CourseUnlockType = Field(default=CourseUnlockType.open)
    unlock_value: Optional[str] = None
    is_published: bool = Field(default=False)
    
    # Relationships
    tenant: Tenant = Relationship(back_populates="courses")
    modules: List["Module"] = Relationship(
        back_populates="course",
        sa_relationship_kwargs={"cascade": "all, delete"}
    )


class Module(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    course_id: uuid.UUID = Field(foreign_key="course.id")
    title: str 
    unlock_type: UnlockType = Field(default=UnlockType.immediate)
    unlock_value: Optional[str] = None # Stores "5", "3", "2026-06-01" as string
    order_index: int = Field(default=0)
    
    # Relationships
    course: Course = Relationship(back_populates="modules")
    lessons: List["Lesson"] = Relationship(
        back_populates="module",
        sa_relationship_kwargs={"cascade": "all, delete"}
    )


class Lesson(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    module_id: uuid.UUID = Field(foreign_key="module.id")
    title: str
    video_provider: Optional[VideoProvider] = Field(default=None, nullable=True)
    video_id: Optional[str] = Field(default=None, nullable=True)
    content: Optional[str] = Field(default=None, nullable=True) # Rich Text (HTML/JSON)
    order_index: int = Field(default=0)
    
    # Relationships
    module: Module = Relationship(back_populates="lessons")
    progress: List["LessonProgress"] = Relationship(
        back_populates="lesson",
        sa_relationship_kwargs={"cascade": "all, delete"}
    )


class LessonProgress(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="user.id")
    lesson_id: uuid.UUID = Field(foreign_key="lesson.id")
    completed_at: datetime = Field(default_factory=datetime.utcnow)

    # Relationships
    lesson: Lesson = Relationship(back_populates="progress")


