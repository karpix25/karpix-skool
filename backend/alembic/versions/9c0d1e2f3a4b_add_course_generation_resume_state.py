"""add course generation resume state

Revision ID: 9c0d1e2f3a4b
Revises: 8a9b0c1d2e3f
Create Date: 2026-07-10 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "9c0d1e2f3a4b"
down_revision: Union[str, Sequence[str], None] = "8a9b0c1d2e3f"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("coursestructuregenerationjob", sa.Column("current_stage", sa.String(64), nullable=True))
    op.add_column(
        "coursestructuregenerationjob",
        sa.Column("planned_lesson_count", sa.Integer(), nullable=False, server_default="0"),
    )
    op.add_column(
        "coursestructuregenerationjob",
        sa.Column("ready_lesson_count", sa.Integer(), nullable=False, server_default="0"),
    )
    op.add_column(
        "coursestructuregenerationjob",
        sa.Column("failed_lesson_count", sa.Integer(), nullable=False, server_default="0"),
    )
    op.add_column(
        "coursestructuregenerationjob",
        sa.Column("source_gap_lesson_count", sa.Integer(), nullable=False, server_default="0"),
    )
    op.add_column(
        "coursestructuregenerationjob",
        sa.Column("resume_count", sa.Integer(), nullable=False, server_default="0"),
    )
    op.add_column("coursestructuregenerationjob", sa.Column("heartbeat_at", sa.DateTime(), nullable=True))
    op.add_column("coursestructuregenerationjob", sa.Column("idempotency_key", sa.String(128), nullable=True))
    op.create_index(
        "ix_coursestructuregenerationjob_current_stage",
        "coursestructuregenerationjob",
        ["current_stage"],
        unique=False,
    )
    op.create_index(
        "ix_coursestructuregenerationjob_heartbeat_at",
        "coursestructuregenerationjob",
        ["heartbeat_at"],
        unique=False,
    )
    op.create_index(
        "ix_coursestructuregenerationjob_idempotency_key",
        "coursestructuregenerationjob",
        ["idempotency_key"],
        unique=True,
    )

    op.create_table(
        "coursestructuregenerationcheckpoint",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("job_id", sa.Uuid(), nullable=False),
        sa.Column("current_stage", sa.String(64), nullable=True),
        sa.Column("source_fingerprint", sa.String(128), nullable=True),
        sa.Column("prompt_version", sa.String(64), nullable=True),
        sa.Column("provider", sa.String(64), nullable=True),
        sa.Column("model_name", sa.String(160), nullable=True),
        sa.Column("source_brief_json", sa.JSON(), nullable=True),
        sa.Column("source_map_json", sa.JSON(), nullable=True),
        sa.Column("product_strategy_json", sa.JSON(), nullable=True),
        sa.Column("blueprint_json", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(
            ["job_id"],
            ["coursestructuregenerationjob.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("job_id", name="uq_course_structure_checkpoint_job"),
    )
    op.create_index(
        "ix_coursestructuregenerationcheckpoint_job_id",
        "coursestructuregenerationcheckpoint",
        ["job_id"],
        unique=False,
    )
    op.create_index(
        "ix_coursestructuregenerationcheckpoint_source_fingerprint",
        "coursestructuregenerationcheckpoint",
        ["source_fingerprint"],
        unique=False,
    )

    op.create_table(
        "coursestructurelessontask",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("job_id", sa.Uuid(), nullable=False),
        sa.Column("module_index", sa.Integer(), nullable=False),
        sa.Column("lesson_index", sa.Integer(), nullable=False),
        sa.Column("order_index", sa.Integer(), nullable=False),
        sa.Column("lesson_title", sa.String(500), nullable=True),
        sa.Column("status", sa.String(32), nullable=False),
        sa.Column("source_pack_json", sa.JSON(), nullable=True),
        sa.Column("lesson_payload_json", sa.JSON(), nullable=True),
        sa.Column("audit_json", sa.JSON(), nullable=True),
        sa.Column("error", sa.String(2000), nullable=True),
        sa.Column("attempt_count", sa.Integer(), nullable=False),
        sa.Column("module_id", sa.Uuid(), nullable=True),
        sa.Column("lesson_id", sa.Uuid(), nullable=True),
        sa.Column("claimed_at", sa.DateTime(), nullable=True),
        sa.Column("heartbeat_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["job_id"], ["coursestructuregenerationjob.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["lesson_id"], ["lesson.id"]),
        sa.ForeignKeyConstraint(["module_id"], ["module.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "job_id",
            "module_index",
            "lesson_index",
            name="uq_course_structure_lesson_task_position",
        ),
    )
    op.create_index(
        "ix_course_structure_lesson_task_claim",
        "coursestructurelessontask",
        ["job_id", "status", "order_index"],
        unique=False,
    )
    for column in ("heartbeat_at", "job_id", "lesson_id", "module_id", "status"):
        op.create_index(
            f"ix_coursestructurelessontask_{column}",
            "coursestructurelessontask",
            [column],
            unique=False,
        )


def downgrade() -> None:
    for column in ("status", "module_id", "lesson_id", "job_id", "heartbeat_at"):
        op.drop_index(f"ix_coursestructurelessontask_{column}", table_name="coursestructurelessontask")
    op.drop_index("ix_course_structure_lesson_task_claim", table_name="coursestructurelessontask")
    op.drop_table("coursestructurelessontask")

    op.drop_index(
        "ix_coursestructuregenerationcheckpoint_source_fingerprint",
        table_name="coursestructuregenerationcheckpoint",
    )
    op.drop_index(
        "ix_coursestructuregenerationcheckpoint_job_id",
        table_name="coursestructuregenerationcheckpoint",
    )
    op.drop_table("coursestructuregenerationcheckpoint")

    op.drop_index("ix_coursestructuregenerationjob_idempotency_key", table_name="coursestructuregenerationjob")
    op.drop_index("ix_coursestructuregenerationjob_heartbeat_at", table_name="coursestructuregenerationjob")
    op.drop_index("ix_coursestructuregenerationjob_current_stage", table_name="coursestructuregenerationjob")
    for column in (
        "idempotency_key",
        "heartbeat_at",
        "resume_count",
        "source_gap_lesson_count",
        "failed_lesson_count",
        "ready_lesson_count",
        "planned_lesson_count",
        "current_stage",
    ):
        op.drop_column("coursestructuregenerationjob", column)
