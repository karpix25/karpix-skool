"""add tenant member role source

Revision ID: c2d3e4f5a6b7
Revises: b1c2d3e4f5a6
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "c2d3e4f5a6b7"
down_revision: Union[str, Sequence[str], None] = "b1c2d3e4f5a6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "tenantmember",
        sa.Column("role_source", sa.String(length=20), nullable=False, server_default="manual"),
    )
    op.create_index("ix_tenantmember_role_source", "tenantmember", ["role_source"])
    op.alter_column("tenantmember", "role_source", server_default=None)


def downgrade() -> None:
    op.drop_index("ix_tenantmember_role_source", table_name="tenantmember")
    op.drop_column("tenantmember", "role_source")
