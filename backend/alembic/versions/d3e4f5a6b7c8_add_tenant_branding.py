"""add tenant branding

Revision ID: d3e4f5a6b7c8
Revises: c2d3e4f5a6b7
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "d3e4f5a6b7c8"
down_revision: Union[str, Sequence[str], None] = "c2d3e4f5a6b7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("tenant", sa.Column("logo_url", sa.String(), nullable=True))
    op.add_column("tenant", sa.Column("accent_color", sa.String(length=7), nullable=True))
    op.add_column("tenant", sa.Column("support_url", sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column("tenant", "support_url")
    op.drop_column("tenant", "accent_color")
    op.drop_column("tenant", "logo_url")
