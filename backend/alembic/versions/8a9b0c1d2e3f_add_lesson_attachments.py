"""add lesson attachments

Revision ID: 8a9b0c1d2e3f
Revises: 5c6d7e8f9a0b
Create Date: 2026-07-09 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "8a9b0c1d2e3f"
down_revision: Union[str, Sequence[str], None] = "5c6d7e8f9a0b"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "lessonattachment",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("tenant_id", sa.Uuid(), nullable=False),
        sa.Column("lesson_id", sa.Uuid(), nullable=False),
        sa.Column("filename", sa.String(length=255), nullable=False),
        sa.Column("content_type", sa.String(length=255), nullable=False),
        sa.Column("size_bytes", sa.BigInteger(), nullable=False),
        sa.Column("storage_key", sa.String(length=1024), nullable=False),
        sa.Column("display_order", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["lesson_id"], ["lesson.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenant.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_lessonattachment_created_at", "lessonattachment", ["created_at"], unique=False)
    op.create_index("ix_lessonattachment_deleted_at", "lessonattachment", ["deleted_at"], unique=False)
    op.create_index("ix_lessonattachment_display_order", "lessonattachment", ["display_order"], unique=False)
    op.create_index("ix_lessonattachment_lesson_id", "lessonattachment", ["lesson_id"], unique=False)
    op.create_index("ix_lessonattachment_lesson_order", "lessonattachment", ["lesson_id", "display_order"], unique=False)
    op.create_index("ix_lessonattachment_storage_key", "lessonattachment", ["storage_key"], unique=False)
    op.create_index("ix_lessonattachment_tenant_id", "lessonattachment", ["tenant_id"], unique=False)
    op.create_index("ix_lessonattachment_tenant_lesson", "lessonattachment", ["tenant_id", "lesson_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_lessonattachment_tenant_lesson", table_name="lessonattachment")
    op.drop_index("ix_lessonattachment_tenant_id", table_name="lessonattachment")
    op.drop_index("ix_lessonattachment_storage_key", table_name="lessonattachment")
    op.drop_index("ix_lessonattachment_lesson_order", table_name="lessonattachment")
    op.drop_index("ix_lessonattachment_lesson_id", table_name="lessonattachment")
    op.drop_index("ix_lessonattachment_display_order", table_name="lessonattachment")
    op.drop_index("ix_lessonattachment_deleted_at", table_name="lessonattachment")
    op.drop_index("ix_lessonattachment_created_at", table_name="lessonattachment")
    op.drop_table("lessonattachment")
