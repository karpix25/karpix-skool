"""add agent layer audit tables

Revision ID: 2a3b4c5d6e7f
Revises: 1d2e3f4a5b6c
Create Date: 2026-07-07 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "2a3b4c5d6e7f"
down_revision: Union[str, Sequence[str], None] = "1d2e3f4a5b6c"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "agentrun",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("tenant_id", sa.Uuid(), nullable=False),
        sa.Column("created_by_user_id", sa.Uuid(), nullable=False),
        sa.Column("task_type", sa.String(length=80), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("approval_status", sa.String(length=32), nullable=False),
        sa.Column("input_json", sa.JSON(), nullable=True),
        sa.Column("error", sa.String(length=2000), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.Column("completed_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["created_by_user_id"], ["user.id"]),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenant.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_agentrun_approval_status", "agentrun", ["approval_status"], unique=False)
    op.create_index("ix_agentrun_created_at", "agentrun", ["created_at"], unique=False)
    op.create_index("ix_agentrun_created_by_status", "agentrun", ["created_by_user_id", "status"], unique=False)
    op.create_index("ix_agentrun_created_by_user_id", "agentrun", ["created_by_user_id"], unique=False)
    op.create_index("ix_agentrun_status", "agentrun", ["status"], unique=False)
    op.create_index("ix_agentrun_task_type", "agentrun", ["task_type"], unique=False)
    op.create_index("ix_agentrun_tenant_created", "agentrun", ["tenant_id", sa.text("created_at DESC")], unique=False)
    op.create_index("ix_agentrun_tenant_id", "agentrun", ["tenant_id"], unique=False)

    op.create_table(
        "agentstep",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("run_id", sa.Uuid(), nullable=False),
        sa.Column("tenant_id", sa.Uuid(), nullable=False),
        sa.Column("sequence", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("input_json", sa.JSON(), nullable=True),
        sa.Column("output_json", sa.JSON(), nullable=True),
        sa.Column("error", sa.String(length=2000), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.Column("completed_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["run_id"], ["agentrun.id"]),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenant.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_agentstep_created_at", "agentstep", ["created_at"], unique=False)
    op.create_index("ix_agentstep_run_id", "agentstep", ["run_id"], unique=False)
    op.create_index("ix_agentstep_run_sequence", "agentstep", ["run_id", "sequence"], unique=False)
    op.create_index("ix_agentstep_status", "agentstep", ["status"], unique=False)
    op.create_index("ix_agentstep_tenant_id", "agentstep", ["tenant_id"], unique=False)

    op.create_table(
        "agentartifact",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("run_id", sa.Uuid(), nullable=False),
        sa.Column("step_id", sa.Uuid(), nullable=True),
        sa.Column("tenant_id", sa.Uuid(), nullable=False),
        sa.Column("artifact_type", sa.String(length=80), nullable=False),
        sa.Column("resource_type", sa.String(length=120), nullable=False),
        sa.Column("resource_id", sa.Uuid(), nullable=False),
        sa.Column("title", sa.String(length=240), nullable=True),
        sa.Column("payload_json", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["run_id"], ["agentrun.id"]),
        sa.ForeignKeyConstraint(["step_id"], ["agentstep.id"]),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenant.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_agentartifact_artifact_type", "agentartifact", ["artifact_type"], unique=False)
    op.create_index("ix_agentartifact_created_at", "agentartifact", ["created_at"], unique=False)
    op.create_index("ix_agentartifact_resource", "agentartifact", ["resource_type", "resource_id"], unique=False)
    op.create_index("ix_agentartifact_resource_id", "agentartifact", ["resource_id"], unique=False)
    op.create_index("ix_agentartifact_resource_type", "agentartifact", ["resource_type"], unique=False)
    op.create_index("ix_agentartifact_run_id", "agentartifact", ["run_id"], unique=False)
    op.create_index("ix_agentartifact_run_type", "agentartifact", ["run_id", "artifact_type"], unique=False)
    op.create_index("ix_agentartifact_step_id", "agentartifact", ["step_id"], unique=False)
    op.create_index("ix_agentartifact_tenant_id", "agentartifact", ["tenant_id"], unique=False)

    op.create_table(
        "agentapproval",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("run_id", sa.Uuid(), nullable=False),
        sa.Column("tenant_id", sa.Uuid(), nullable=False),
        sa.Column("requested_by_user_id", sa.Uuid(), nullable=False),
        sa.Column("approval_type", sa.String(length=80), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("target_artifact_id", sa.Uuid(), nullable=True),
        sa.Column("request_json", sa.JSON(), nullable=True),
        sa.Column("response_json", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.Column("decided_at", sa.DateTime(), nullable=True),
        sa.Column("decided_by_user_id", sa.Uuid(), nullable=True),
        sa.ForeignKeyConstraint(["decided_by_user_id"], ["user.id"]),
        sa.ForeignKeyConstraint(["requested_by_user_id"], ["user.id"]),
        sa.ForeignKeyConstraint(["run_id"], ["agentrun.id"]),
        sa.ForeignKeyConstraint(["target_artifact_id"], ["agentartifact.id"]),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenant.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_agentapproval_approval_type", "agentapproval", ["approval_type"], unique=False)
    op.create_index("ix_agentapproval_created_at", "agentapproval", ["created_at"], unique=False)
    op.create_index("ix_agentapproval_decided_by_user_id", "agentapproval", ["decided_by_user_id"], unique=False)
    op.create_index("ix_agentapproval_requested_by_user_id", "agentapproval", ["requested_by_user_id"], unique=False)
    op.create_index("ix_agentapproval_run_id", "agentapproval", ["run_id"], unique=False)
    op.create_index("ix_agentapproval_run_status", "agentapproval", ["run_id", "status"], unique=False)
    op.create_index("ix_agentapproval_status", "agentapproval", ["status"], unique=False)
    op.create_index("ix_agentapproval_target_artifact_id", "agentapproval", ["target_artifact_id"], unique=False)
    op.create_index("ix_agentapproval_tenant_id", "agentapproval", ["tenant_id"], unique=False)
    op.create_index("ix_agentapproval_tenant_status", "agentapproval", ["tenant_id", "status"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_agentapproval_tenant_status", table_name="agentapproval")
    op.drop_index("ix_agentapproval_tenant_id", table_name="agentapproval")
    op.drop_index("ix_agentapproval_target_artifact_id", table_name="agentapproval")
    op.drop_index("ix_agentapproval_status", table_name="agentapproval")
    op.drop_index("ix_agentapproval_run_status", table_name="agentapproval")
    op.drop_index("ix_agentapproval_run_id", table_name="agentapproval")
    op.drop_index("ix_agentapproval_requested_by_user_id", table_name="agentapproval")
    op.drop_index("ix_agentapproval_decided_by_user_id", table_name="agentapproval")
    op.drop_index("ix_agentapproval_created_at", table_name="agentapproval")
    op.drop_index("ix_agentapproval_approval_type", table_name="agentapproval")
    op.drop_table("agentapproval")

    op.drop_index("ix_agentartifact_tenant_id", table_name="agentartifact")
    op.drop_index("ix_agentartifact_step_id", table_name="agentartifact")
    op.drop_index("ix_agentartifact_run_type", table_name="agentartifact")
    op.drop_index("ix_agentartifact_run_id", table_name="agentartifact")
    op.drop_index("ix_agentartifact_resource_type", table_name="agentartifact")
    op.drop_index("ix_agentartifact_resource_id", table_name="agentartifact")
    op.drop_index("ix_agentartifact_resource", table_name="agentartifact")
    op.drop_index("ix_agentartifact_created_at", table_name="agentartifact")
    op.drop_index("ix_agentartifact_artifact_type", table_name="agentartifact")
    op.drop_table("agentartifact")

    op.drop_index("ix_agentstep_tenant_id", table_name="agentstep")
    op.drop_index("ix_agentstep_status", table_name="agentstep")
    op.drop_index("ix_agentstep_run_sequence", table_name="agentstep")
    op.drop_index("ix_agentstep_run_id", table_name="agentstep")
    op.drop_index("ix_agentstep_created_at", table_name="agentstep")
    op.drop_table("agentstep")

    op.drop_index("ix_agentrun_tenant_id", table_name="agentrun")
    op.drop_index("ix_agentrun_tenant_created", table_name="agentrun")
    op.drop_index("ix_agentrun_task_type", table_name="agentrun")
    op.drop_index("ix_agentrun_status", table_name="agentrun")
    op.drop_index("ix_agentrun_created_by_user_id", table_name="agentrun")
    op.drop_index("ix_agentrun_created_by_status", table_name="agentrun")
    op.drop_index("ix_agentrun_created_at", table_name="agentrun")
    op.drop_index("ix_agentrun_approval_status", table_name="agentrun")
    op.drop_table("agentrun")
