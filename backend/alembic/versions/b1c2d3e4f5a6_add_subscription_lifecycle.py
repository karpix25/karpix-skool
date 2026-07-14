"""add subscription lifecycle

Revision ID: b1c2d3e4f5a6
Revises: a0b1c2d3e4f5
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "b1c2d3e4f5a6"
down_revision: Union[str, Sequence[str], None] = "a0b1c2d3e4f5"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


TRIAL_PLAN_ID = "10000000-0000-0000-0000-000000000001"
STARTER_PLAN_ID = "10000000-0000-0000-0000-000000000002"
PRO_PLAN_ID = "10000000-0000-0000-0000-000000000003"


def upgrade() -> None:
    lifecycle = sa.Enum(
        "draft",
        "trialing",
        "active",
        "past_due",
        "suspended",
        "canceled",
        name="subscriptionlifecyclestatus",
    )
    lifecycle.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "tenantplan",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("code", sa.String(length=40), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("max_courses", sa.Integer(), nullable=False),
        sa.Column("max_students", sa.Integer(), nullable=False),
        sa.Column("max_ai_jobs_per_month", sa.Integer(), nullable=False),
        sa.Column("max_storage_bytes", sa.BigInteger(), nullable=False),
        sa.Column("trial_days", sa.Integer(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("code", name="uq_tenantplan_code"),
    )
    op.create_index("ix_tenantplan_code", "tenantplan", ["code"])
    op.create_index("ix_tenantplan_is_active", "tenantplan", ["is_active"])

    op.create_table(
        "tenantsubscription",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("tenant_id", sa.Uuid(), nullable=False),
        sa.Column("plan_id", sa.Uuid(), nullable=False),
        sa.Column(
            "status",
            postgresql.ENUM(
                "draft",
                "trialing",
                "active",
                "past_due",
                "suspended",
                "canceled",
                name="subscriptionlifecyclestatus",
                create_type=False,
            ),
            nullable=False,
        ),
        sa.Column("started_at", sa.DateTime(), nullable=False),
        sa.Column("current_period_start", sa.DateTime(), nullable=False),
        sa.Column("current_period_end", sa.DateTime(), nullable=True),
        sa.Column("trial_ends_at", sa.DateTime(), nullable=True),
        sa.Column("activated_by_user_id", sa.Uuid(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["activated_by_user_id"], ["user.id"]),
        sa.ForeignKeyConstraint(["plan_id"], ["tenantplan.id"]),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenant.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("tenant_id", name="uq_tenantsubscription_tenant"),
    )
    op.create_index("ix_tenantsubscription_plan_id", "tenantsubscription", ["plan_id"])
    op.create_index("ix_tenantsubscription_status", "tenantsubscription", ["status"])
    op.create_index("ix_tenantsubscription_tenant_id", "tenantsubscription", ["tenant_id"])
    op.create_index(
        "ix_tenantsubscription_status_period_end",
        "tenantsubscription",
        ["status", "current_period_end"],
    )

    op.create_table(
        "tenantusageperiod",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("tenant_id", sa.Uuid(), nullable=False),
        sa.Column("period_start", sa.DateTime(), nullable=False),
        sa.Column("period_end", sa.DateTime(), nullable=False),
        sa.Column("ai_jobs", sa.Integer(), nullable=False),
        sa.Column("storage_bytes", sa.BigInteger(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenant.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "tenant_id",
            "period_start",
            "period_end",
            name="uq_tenantusageperiod_tenant_period",
        ),
    )
    op.create_index("ix_tenantusageperiod_tenant_id", "tenantusageperiod", ["tenant_id"])
    op.create_index(
        "ix_tenantusageperiod_lookup",
        "tenantusageperiod",
        ["tenant_id", "period_start", "period_end"],
    )

    op.create_table(
        "tenantsubscriptionevent",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("tenant_id", sa.Uuid(), nullable=False),
        sa.Column("subscription_id", sa.Uuid(), nullable=True),
        sa.Column("event_type", sa.String(length=80), nullable=False),
        sa.Column("from_status", sa.String(length=20), nullable=True),
        sa.Column("to_status", sa.String(length=20), nullable=True),
        sa.Column("actor_user_id", sa.Uuid(), nullable=True),
        sa.Column("reason", sa.String(length=500), nullable=True),
        sa.Column("event_meta", sa.JSON(), nullable=True),
        sa.Column("occurred_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["actor_user_id"], ["user.id"]),
        sa.ForeignKeyConstraint(["subscription_id"], ["tenantsubscription.id"]),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenant.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_tenantsubscriptionevent_event_type", "tenantsubscriptionevent", ["event_type"])
    op.create_index("ix_tenantsubscriptionevent_tenant_id", "tenantsubscriptionevent", ["tenant_id"])
    op.create_index(
        "ix_tenantsubscriptionevent_tenant_occurred",
        "tenantsubscriptionevent",
        ["tenant_id", sa.text("occurred_at DESC")],
    )

    op.execute(
        sa.text(
            """
            INSERT INTO tenantplan
                (id, code, name, max_courses, max_students, max_ai_jobs_per_month,
                 max_storage_bytes, trial_days, is_active, created_at, updated_at)
            VALUES
                (:trial_id, 'trial', 'Пробный', 1, 20, 20, 1073741824, 7, true, NOW(), NOW()),
                (:starter_id, 'starter', 'Старт', 3, 100, 100, 5368709120, 0, true, NOW(), NOW()),
                (:pro_id, 'pro', 'Про', 20, 1000, 500, 53687091200, 0, true, NOW(), NOW())
            """
        ).bindparams(
            trial_id=TRIAL_PLAN_ID,
            starter_id=STARTER_PLAN_ID,
            pro_id=PRO_PLAN_ID,
        )
    )
    op.execute(
        sa.text(
            """
            INSERT INTO tenantsubscription
                (id, tenant_id, plan_id, status, started_at, current_period_start,
                 current_period_end, trial_ends_at, created_at, updated_at)
            SELECT md5(id::text)::uuid, id, :starter_id,
                   CASE WHEN subscription_status = 'active'
                        THEN 'active'::subscriptionlifecyclestatus
                        ELSE 'past_due'::subscriptionlifecyclestatus END,
                   created_at, created_at, expires_at, NULL, NOW(), NOW()
            FROM tenant
            WHERE deleted_at IS NULL
            ON CONFLICT (tenant_id) DO NOTHING
            """
        ).bindparams(starter_id=STARTER_PLAN_ID)
    )


def downgrade() -> None:
    op.drop_index("ix_tenantsubscriptionevent_tenant_occurred", table_name="tenantsubscriptionevent")
    op.drop_index("ix_tenantsubscriptionevent_tenant_id", table_name="tenantsubscriptionevent")
    op.drop_index("ix_tenantsubscriptionevent_event_type", table_name="tenantsubscriptionevent")
    op.drop_table("tenantsubscriptionevent")
    op.drop_index("ix_tenantusageperiod_lookup", table_name="tenantusageperiod")
    op.drop_index("ix_tenantusageperiod_tenant_id", table_name="tenantusageperiod")
    op.drop_table("tenantusageperiod")
    op.drop_index("ix_tenantsubscription_status_period_end", table_name="tenantsubscription")
    op.drop_index("ix_tenantsubscription_tenant_id", table_name="tenantsubscription")
    op.drop_index("ix_tenantsubscription_status", table_name="tenantsubscription")
    op.drop_index("ix_tenantsubscription_plan_id", table_name="tenantsubscription")
    op.drop_table("tenantsubscription")
    op.drop_index("ix_tenantplan_is_active", table_name="tenantplan")
    op.drop_index("ix_tenantplan_code", table_name="tenantplan")
    op.drop_table("tenantplan")
    sa.Enum(name="subscriptionlifecyclestatus").drop(op.get_bind(), checkfirst=True)
