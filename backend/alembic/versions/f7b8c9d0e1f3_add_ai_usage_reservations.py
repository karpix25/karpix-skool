"""add idempotent ai usage reservations

Revision ID: f7b8c9d0e1f3
Revises: e4f5a6b7c8d9
"""

from alembic import op
import sqlalchemy as sa


revision = "f7b8c9d0e1f3"
down_revision = "e4f5a6b7c8d9"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "tenantaiusagereservation",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("tenant_id", sa.Uuid(), nullable=False),
        sa.Column("operation_key", sa.String(length=180), nullable=False),
        sa.Column("period_start", sa.DateTime(), nullable=False),
        sa.Column("period_end", sa.DateTime(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenant.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "tenant_id",
            "operation_key",
            name="uq_tenantaiusagereservation_operation",
        ),
    )
    op.create_index(
        "ix_tenantaiusagereservation_tenant_id",
        "tenantaiusagereservation",
        ["tenant_id"],
    )
    op.create_index(
        "ix_tenantaiusagereservation_period_start",
        "tenantaiusagereservation",
        ["period_start"],
    )
    op.create_index(
        "ix_tenantaiusagereservation_period_end",
        "tenantaiusagereservation",
        ["period_end"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_tenantaiusagereservation_period_end",
        table_name="tenantaiusagereservation",
    )
    op.drop_index(
        "ix_tenantaiusagereservation_period_start",
        table_name="tenantaiusagereservation",
    )
    op.drop_index(
        "ix_tenantaiusagereservation_tenant_id",
        table_name="tenantaiusagereservation",
    )
    op.drop_table("tenantaiusagereservation")
