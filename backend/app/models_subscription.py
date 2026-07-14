from datetime import datetime
from enum import Enum
from typing import Optional
import uuid

import sqlalchemy as sa
from sqlmodel import Field, SQLModel


class SubscriptionLifecycleStatus(str, Enum):
    draft = "draft"
    trialing = "trialing"
    active = "active"
    past_due = "past_due"
    suspended = "suspended"
    canceled = "canceled"


class TenantPlan(SQLModel, table=True):
    __table_args__ = (sa.UniqueConstraint("code", name="uq_tenantplan_code"),)

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    code: str = Field(index=True, max_length=40)
    name: str = Field(max_length=120)
    max_courses: int = Field(default=1, ge=0)
    max_students: int = Field(default=20, ge=0)
    max_ai_jobs_per_month: int = Field(default=20, ge=0)
    max_storage_bytes: int = Field(default=1_073_741_824, ge=0, sa_type=sa.BigInteger)
    trial_days: int = Field(default=0, ge=0)
    is_active: bool = Field(default=True, index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class TenantSubscription(SQLModel, table=True):
    __table_args__ = (
        sa.UniqueConstraint("tenant_id", name="uq_tenantsubscription_tenant"),
        sa.Index("ix_tenantsubscription_status_period_end", "status", "current_period_end"),
    )

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    tenant_id: uuid.UUID = Field(foreign_key="tenant.id", index=True)
    plan_id: uuid.UUID = Field(foreign_key="tenantplan.id", index=True)
    status: SubscriptionLifecycleStatus = Field(
        default=SubscriptionLifecycleStatus.trialing,
        sa_column=sa.Column(
            sa.Enum(SubscriptionLifecycleStatus, name="subscriptionlifecyclestatus"),
            nullable=False,
            index=True,
        ),
    )
    started_at: datetime = Field(default_factory=datetime.utcnow)
    current_period_start: datetime = Field(default_factory=datetime.utcnow)
    current_period_end: Optional[datetime] = Field(default=None, index=True)
    trial_ends_at: Optional[datetime] = Field(default=None, index=True)
    activated_by_user_id: Optional[uuid.UUID] = Field(
        default=None,
        foreign_key="user.id",
        nullable=True,
        index=True,
    )
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class TenantUsagePeriod(SQLModel, table=True):
    __table_args__ = (
        sa.UniqueConstraint(
            "tenant_id",
            "period_start",
            "period_end",
            name="uq_tenantusageperiod_tenant_period",
        ),
        sa.Index("ix_tenantusageperiod_lookup", "tenant_id", "period_start", "period_end"),
    )

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    tenant_id: uuid.UUID = Field(foreign_key="tenant.id", index=True)
    period_start: datetime = Field(index=True)
    period_end: datetime = Field(index=True)
    ai_jobs: int = Field(default=0, ge=0)
    storage_bytes: int = Field(default=0, ge=0, sa_type=sa.BigInteger)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class TenantAIUsageReservation(SQLModel, table=True):
    __table_args__ = (
        sa.UniqueConstraint(
            "tenant_id",
            "operation_key",
            name="uq_tenantaiusagereservation_operation",
        ),
    )

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    tenant_id: uuid.UUID = Field(foreign_key="tenant.id", index=True)
    operation_key: str = Field(max_length=180)
    period_start: datetime = Field(index=True)
    period_end: datetime = Field(index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class TenantStorageUsage(SQLModel, table=True):
    __table_args__ = (
        sa.UniqueConstraint("tenant_id", name="uq_tenantstorageusage_tenant"),
    )

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    tenant_id: uuid.UUID = Field(foreign_key="tenant.id", index=True)
    storage_bytes: int = Field(default=0, ge=0, sa_type=sa.BigInteger)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class TenantSubscriptionEvent(SQLModel, table=True):
    __table_args__ = (
        sa.Index(
            "ix_tenantsubscriptionevent_tenant_occurred",
            "tenant_id",
            sa.text("occurred_at DESC"),
        ),
    )

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    tenant_id: uuid.UUID = Field(foreign_key="tenant.id", index=True)
    subscription_id: Optional[uuid.UUID] = Field(
        default=None,
        foreign_key="tenantsubscription.id",
        nullable=True,
        index=True,
    )
    event_type: str = Field(max_length=80, index=True)
    from_status: Optional[str] = Field(default=None, max_length=20)
    to_status: Optional[str] = Field(default=None, max_length=20)
    actor_user_id: Optional[uuid.UUID] = Field(
        default=None,
        foreign_key="user.id",
        nullable=True,
        index=True,
    )
    reason: Optional[str] = Field(default=None, max_length=500)
    event_meta: Optional[dict] = Field(default=None, sa_type=sa.JSON)
    occurred_at: datetime = Field(default_factory=datetime.utcnow, index=True)
