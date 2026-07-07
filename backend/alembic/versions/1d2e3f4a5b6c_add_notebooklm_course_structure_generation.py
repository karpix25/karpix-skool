"""add notebooklm course structure generation

Revision ID: 1d2e3f4a5b6c
Revises: 0c1d2e3f4a5b
Create Date: 2026-07-07 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel


# revision identifiers, used by Alembic.
revision: str = "1d2e3f4a5b6c"
down_revision: Union[str, Sequence[str], None] = "0c1d2e3f4a5b"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "coursestructuregenerationjob",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("tenant_id", sa.Uuid(), nullable=False),
        sa.Column("course_id", sa.Uuid(), nullable=False),
        sa.Column("created_by_user_id", sa.Uuid(), nullable=False),
        sa.Column("notebook_url", sqlmodel.sql.sqltypes.AutoString(length=2048), nullable=False),
        sa.Column("module_count", sa.Integer(), nullable=False),
        sa.Column("lessons_per_module", sa.Integer(), nullable=False),
        sa.Column("audience_level", sqlmodel.sql.sqltypes.AutoString(length=120), nullable=True),
        sa.Column("style", sqlmodel.sql.sqltypes.AutoString(length=240), nullable=True),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("request_json", sa.JSON(), nullable=True),
        sa.Column("response_json", sa.JSON(), nullable=True),
        sa.Column("error", sqlmodel.sql.sqltypes.AutoString(length=2000), nullable=True),
        sa.Column("created_module_count", sa.Integer(), nullable=False),
        sa.Column("created_lesson_count", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.Column("started_at", sa.DateTime(), nullable=True),
        sa.Column("completed_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["course_id"], ["course.id"]),
        sa.ForeignKeyConstraint(["created_by_user_id"], ["user.id"]),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenant.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_coursestructuregenerationjob_course_id", "coursestructuregenerationjob", ["course_id"], unique=False)
    op.create_index("ix_coursestructuregenerationjob_course_status", "coursestructuregenerationjob", ["course_id", "status"], unique=False)
    op.create_index("ix_coursestructuregenerationjob_created_at", "coursestructuregenerationjob", ["created_at"], unique=False)
    op.create_index("ix_coursestructuregenerationjob_created_by_user_id", "coursestructuregenerationjob", ["created_by_user_id"], unique=False)
    op.create_index("ix_coursestructuregenerationjob_status", "coursestructuregenerationjob", ["status"], unique=False)
    op.create_index("ix_coursestructuregenerationjob_tenant_created", "coursestructuregenerationjob", ["tenant_id", sa.text("created_at DESC")], unique=False)
    op.create_index("ix_coursestructuregenerationjob_tenant_id", "coursestructuregenerationjob", ["tenant_id"], unique=False)

    op.create_table(
        "generatedcoursemoduledraft",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("job_id", sa.Uuid(), nullable=False),
        sa.Column("module_id", sa.Uuid(), nullable=False),
        sa.Column("order_index", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["job_id"], ["coursestructuregenerationjob.id"]),
        sa.ForeignKeyConstraint(["module_id"], ["module.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_generatedcoursemoduledraft_job_id", "generatedcoursemoduledraft", ["job_id"], unique=False)
    op.create_index("ix_generatedcoursemoduledraft_job_order", "generatedcoursemoduledraft", ["job_id", "order_index"], unique=False)
    op.create_index("ix_generatedcoursemoduledraft_module_id", "generatedcoursemoduledraft", ["module_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_generatedcoursemoduledraft_module_id", table_name="generatedcoursemoduledraft")
    op.drop_index("ix_generatedcoursemoduledraft_job_order", table_name="generatedcoursemoduledraft")
    op.drop_index("ix_generatedcoursemoduledraft_job_id", table_name="generatedcoursemoduledraft")
    op.drop_table("generatedcoursemoduledraft")

    op.drop_index("ix_coursestructuregenerationjob_tenant_id", table_name="coursestructuregenerationjob")
    op.drop_index("ix_coursestructuregenerationjob_tenant_created", table_name="coursestructuregenerationjob")
    op.drop_index("ix_coursestructuregenerationjob_status", table_name="coursestructuregenerationjob")
    op.drop_index("ix_coursestructuregenerationjob_created_by_user_id", table_name="coursestructuregenerationjob")
    op.drop_index("ix_coursestructuregenerationjob_created_at", table_name="coursestructuregenerationjob")
    op.drop_index("ix_coursestructuregenerationjob_course_status", table_name="coursestructuregenerationjob")
    op.drop_index("ix_coursestructuregenerationjob_course_id", table_name="coursestructuregenerationjob")
    op.drop_table("coursestructuregenerationjob")
