"""add last_sync_at to tenant

Revision ID: e2f1a3b4c5d2
Revises: c1d2e3f4g5h6
Create Date: 2026-02-19 15:35:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel


# revision identifiers, used by Alembic.
revision: str = 'e2f1a3b4c5d2'
down_revision: Union[str, Sequence[str], None] = 'c1d2e3f4g5h6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add last_sync_at column to tenant table
    op.add_column('tenant', sa.Column('last_sync_at', sa.DateTime(), nullable=True))


def downgrade() -> None:
    # Remove last_sync_at column from tenant table
    op.drop_column('tenant', 'last_sync_at')
