"""add course metadata and student favorites

Revision ID: f0a1b2c3d4e5
Revises: a8b9c0d1e2f4
"""

from typing import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = "f0a1b2c3d4e5"
down_revision: str | None = "a8b9c0d1e2f4"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "course",
        sa.Column(
            "content_type",
            sa.String(length=9),
            nullable=False,
            server_default="course",
        ),
    )
    op.add_column("course", sa.Column("category", sa.String(length=100), nullable=True))
    op.add_column(
        "course",
        sa.Column(
            "tags",
            sa.JSON(),
            nullable=False,
            server_default=sa.text("'[]'::json"),
        ),
    )
    op.create_index("ix_course_content_type", "course", ["content_type"], unique=False)
    op.create_index("ix_course_category", "course", ["category"], unique=False)
    op.alter_column("course", "content_type", server_default=None)
    op.alter_column("course", "tags", server_default=None)

    op.create_table(
        "coursefavorite",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("tenant_id", sa.Uuid(), nullable=False),
        sa.Column("course_id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["course_id"], ["course.id"]),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenant.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["user.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "user_id",
            "tenant_id",
            "course_id",
            name="uq_coursefavorite_user_tenant_course",
        ),
    )
    op.create_index("ix_coursefavorite_tenant_id", "coursefavorite", ["tenant_id"])
    op.create_index("ix_coursefavorite_course_id", "coursefavorite", ["course_id"])
    op.create_index("ix_coursefavorite_user_id", "coursefavorite", ["user_id"])
    op.create_index("ix_coursefavorite_created_at", "coursefavorite", ["created_at"])
    op.create_index(
        "ix_coursefavorite_tenant_user",
        "coursefavorite",
        ["tenant_id", "user_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_coursefavorite_tenant_user", table_name="coursefavorite")
    op.drop_index("ix_coursefavorite_created_at", table_name="coursefavorite")
    op.drop_index("ix_coursefavorite_user_id", table_name="coursefavorite")
    op.drop_index("ix_coursefavorite_course_id", table_name="coursefavorite")
    op.drop_index("ix_coursefavorite_tenant_id", table_name="coursefavorite")
    op.drop_table("coursefavorite")
    op.drop_index("ix_course_category", table_name="course")
    op.drop_index("ix_course_content_type", table_name="course")
    op.drop_column("course", "tags")
    op.drop_column("course", "category")
    op.drop_column("course", "content_type")
