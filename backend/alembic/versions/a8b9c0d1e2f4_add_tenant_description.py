"""add tenant description

Revision ID: a8b9c0d1e2f4
Revises: f7b8c9d0e1f3
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op


revision: str = "a8b9c0d1e2f4"
down_revision: str | None = "f7b8c9d0e1f3"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("tenant", sa.Column("description", sa.String(length=2000), nullable=True))


def downgrade() -> None:
    op.drop_column("tenant", "description")
