"""add notebooklm lesson generation jobs

Revision ID: 0c1d2e3f4a5b
Revises: f6a7b8c9d0e2
Create Date: 2026-07-07 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel


# revision identifiers, used by Alembic.
revision: str = "0c1d2e3f4a5b"
down_revision: Union[str, Sequence[str], None] = "f6a7b8c9d0e2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "lessongenerationjob",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("tenant_id", sa.Uuid(), nullable=False),
        sa.Column("course_id", sa.Uuid(), nullable=False),
        sa.Column("module_id", sa.Uuid(), nullable=False),
        sa.Column("created_by_user_id", sa.Uuid(), nullable=False),
        sa.Column("notebook_url", sqlmodel.sql.sqltypes.AutoString(length=2048), nullable=False),
        sa.Column("lesson_count", sa.Integer(), nullable=False),
        sa.Column("audience_level", sqlmodel.sql.sqltypes.AutoString(length=120), nullable=True),
        sa.Column("style", sqlmodel.sql.sqltypes.AutoString(length=240), nullable=True),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("request_json", sa.JSON(), nullable=True),
        sa.Column("response_json", sa.JSON(), nullable=True),
        sa.Column("error", sqlmodel.sql.sqltypes.AutoString(length=2000), nullable=True),
        sa.Column("created_lesson_count", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.Column("started_at", sa.DateTime(), nullable=True),
        sa.Column("completed_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["course_id"], ["course.id"]),
        sa.ForeignKeyConstraint(["created_by_user_id"], ["user.id"]),
        sa.ForeignKeyConstraint(["module_id"], ["module.id"]),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenant.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_lessongenerationjob_course_id", "lessongenerationjob", ["course_id"], unique=False)
    op.create_index("ix_lessongenerationjob_created_at", "lessongenerationjob", ["created_at"], unique=False)
    op.create_index("ix_lessongenerationjob_created_by_user_id", "lessongenerationjob", ["created_by_user_id"], unique=False)
    op.create_index("ix_lessongenerationjob_module_id", "lessongenerationjob", ["module_id"], unique=False)
    op.create_index("ix_lessongenerationjob_module_status", "lessongenerationjob", ["module_id", "status"], unique=False)
    op.create_index("ix_lessongenerationjob_status", "lessongenerationjob", ["status"], unique=False)
    op.create_index("ix_lessongenerationjob_tenant_created", "lessongenerationjob", ["tenant_id", sa.text("created_at DESC")], unique=False)
    op.create_index("ix_lessongenerationjob_tenant_id", "lessongenerationjob", ["tenant_id"], unique=False)

    op.create_table(
        "generatedlessondraft",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("job_id", sa.Uuid(), nullable=False),
        sa.Column("lesson_id", sa.Uuid(), nullable=False),
        sa.Column("order_index", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["job_id"], ["lessongenerationjob.id"]),
        sa.ForeignKeyConstraint(["lesson_id"], ["lesson.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_generatedlessondraft_job_id", "generatedlessondraft", ["job_id"], unique=False)
    op.create_index("ix_generatedlessondraft_job_order", "generatedlessondraft", ["job_id", "order_index"], unique=False)
    op.create_index("ix_generatedlessondraft_lesson_id", "generatedlessondraft", ["lesson_id"], unique=False)

    op.create_table(
        "notebooklmauthsession",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("token_hash", sqlmodel.sql.sqltypes.AutoString(length=64), nullable=False),
        sa.Column("requested_by_user_id", sa.Uuid(), nullable=True),
        sa.Column("job_id", sa.Uuid(), nullable=True),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("reason", sqlmodel.sql.sqltypes.AutoString(length=1000), nullable=True),
        sa.Column("auth_url", sqlmodel.sql.sqltypes.AutoString(length=2048), nullable=True),
        sa.Column("setup_result_json", sa.JSON(), nullable=True),
        sa.Column("health_json", sa.JSON(), nullable=True),
        sa.Column("error", sqlmodel.sql.sqltypes.AutoString(length=2000), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.Column("expires_at", sa.DateTime(), nullable=False),
        sa.Column("used_at", sa.DateTime(), nullable=True),
        sa.Column("started_at", sa.DateTime(), nullable=True),
        sa.Column("completed_at", sa.DateTime(), nullable=True),
        sa.Column("notification_sent_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["job_id"], ["lessongenerationjob.id"]),
        sa.ForeignKeyConstraint(["requested_by_user_id"], ["user.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("token_hash", name="uq_notebooklmauthsession_token_hash"),
    )
    op.create_index("ix_notebooklmauthsession_created_at", "notebooklmauthsession", ["created_at"], unique=False)
    op.create_index("ix_notebooklmauthsession_expires_at", "notebooklmauthsession", ["expires_at"], unique=False)
    op.create_index("ix_notebooklmauthsession_job_id", "notebooklmauthsession", ["job_id"], unique=False)
    op.create_index("ix_notebooklmauthsession_job_status", "notebooklmauthsession", ["job_id", "status"], unique=False)
    op.create_index("ix_notebooklmauthsession_requested_by_user_id", "notebooklmauthsession", ["requested_by_user_id"], unique=False)
    op.create_index("ix_notebooklmauthsession_status", "notebooklmauthsession", ["status"], unique=False)
    op.create_index("ix_notebooklmauthsession_status_expires", "notebooklmauthsession", ["status", "expires_at"], unique=False)
    op.create_index("ix_notebooklmauthsession_token_hash", "notebooklmauthsession", ["token_hash"], unique=False)
    op.create_index("ix_notebooklmauthsession_used_at", "notebooklmauthsession", ["used_at"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_notebooklmauthsession_token_hash", table_name="notebooklmauthsession")
    op.drop_index("ix_notebooklmauthsession_used_at", table_name="notebooklmauthsession")
    op.drop_index("ix_notebooklmauthsession_status_expires", table_name="notebooklmauthsession")
    op.drop_index("ix_notebooklmauthsession_status", table_name="notebooklmauthsession")
    op.drop_index("ix_notebooklmauthsession_requested_by_user_id", table_name="notebooklmauthsession")
    op.drop_index("ix_notebooklmauthsession_job_status", table_name="notebooklmauthsession")
    op.drop_index("ix_notebooklmauthsession_job_id", table_name="notebooklmauthsession")
    op.drop_index("ix_notebooklmauthsession_expires_at", table_name="notebooklmauthsession")
    op.drop_index("ix_notebooklmauthsession_created_at", table_name="notebooklmauthsession")
    op.drop_table("notebooklmauthsession")

    op.drop_index("ix_generatedlessondraft_lesson_id", table_name="generatedlessondraft")
    op.drop_index("ix_generatedlessondraft_job_order", table_name="generatedlessondraft")
    op.drop_index("ix_generatedlessondraft_job_id", table_name="generatedlessondraft")
    op.drop_table("generatedlessondraft")

    op.drop_index("ix_lessongenerationjob_tenant_id", table_name="lessongenerationjob")
    op.drop_index("ix_lessongenerationjob_tenant_created", table_name="lessongenerationjob")
    op.drop_index("ix_lessongenerationjob_status", table_name="lessongenerationjob")
    op.drop_index("ix_lessongenerationjob_module_status", table_name="lessongenerationjob")
    op.drop_index("ix_lessongenerationjob_module_id", table_name="lessongenerationjob")
    op.drop_index("ix_lessongenerationjob_created_by_user_id", table_name="lessongenerationjob")
    op.drop_index("ix_lessongenerationjob_created_at", table_name="lessongenerationjob")
    op.drop_index("ix_lessongenerationjob_course_id", table_name="lessongenerationjob")
    op.drop_table("lessongenerationjob")
