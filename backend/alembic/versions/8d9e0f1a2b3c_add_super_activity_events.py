"""add super activity events

Revision ID: 8d9e0f1a2b3c
Revises: 7b8c9d0e1f2a
Create Date: 2026-07-12 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "8d9e0f1a2b3c"
down_revision: Union[str, Sequence[str], None] = "7b8c9d0e1f2a"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "superactivityevent",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("event_type", sa.String(length=80), nullable=False),
        sa.Column("tone", sa.String(length=20), nullable=False),
        sa.Column("occurred_at", sa.DateTime(), nullable=False),
        sa.Column("actor_user_id", sa.Uuid(), nullable=True),
        sa.Column("tenant_id", sa.Uuid(), nullable=True),
        sa.Column("target_type", sa.String(length=80), nullable=True),
        sa.Column("target_id", sa.String(length=120), nullable=True),
        sa.Column("title", sa.String(length=180), nullable=False),
        sa.Column("message", sa.String(length=1000), nullable=False),
        sa.Column("metadata", sa.JSON(), nullable=True),
        sa.Column("dedupe_key", sa.String(length=255), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["actor_user_id"], ["user.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenant.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("dedupe_key"),
    )
    op.create_index("ix_superactivityevent_actor_user_id", "superactivityevent", ["actor_user_id"])
    op.create_index("ix_superactivityevent_created_at", "superactivityevent", ["created_at"])
    op.create_index("ix_superactivityevent_dedupe_key", "superactivityevent", ["dedupe_key"])
    op.create_index("ix_superactivityevent_event_type", "superactivityevent", ["event_type"])
    op.create_index("ix_superactivityevent_occurred_at", "superactivityevent", [sa.text("occurred_at DESC")])
    op.create_index("ix_superactivityevent_target_id", "superactivityevent", ["target_id"])
    op.create_index("ix_superactivityevent_tenant_id", "superactivityevent", ["tenant_id"])
    op.create_index(
        "ix_superactivityevent_tenant_occurred_at",
        "superactivityevent",
        ["tenant_id", sa.text("occurred_at DESC")],
    )
    op.create_index(
        "ix_superactivityevent_type_occurred_at",
        "superactivityevent",
        ["event_type", sa.text("occurred_at DESC")],
    )


def downgrade() -> None:
    op.drop_index("ix_superactivityevent_type_occurred_at", table_name="superactivityevent")
    op.drop_index("ix_superactivityevent_tenant_occurred_at", table_name="superactivityevent")
    op.drop_index("ix_superactivityevent_tenant_id", table_name="superactivityevent")
    op.drop_index("ix_superactivityevent_target_id", table_name="superactivityevent")
    op.drop_index("ix_superactivityevent_occurred_at", table_name="superactivityevent")
    op.drop_index("ix_superactivityevent_event_type", table_name="superactivityevent")
    op.drop_index("ix_superactivityevent_dedupe_key", table_name="superactivityevent")
    op.drop_index("ix_superactivityevent_created_at", table_name="superactivityevent")
    op.drop_index("ix_superactivityevent_actor_user_id", table_name="superactivityevent")
    op.drop_table("superactivityevent")
