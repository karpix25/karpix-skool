"""drop legacy notebook auth sessions

Revision ID: 3b4c5d6e7f80
Revises: 2a3b4c5d6e7f
Create Date: 2026-07-07 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "3b4c5d6e7f80"
down_revision: Union[str, Sequence[str], None] = "2a3b4c5d6e7f"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

LEGACY_AUTH_TABLE = "notebooklmauthsession"


def upgrade() -> None:
    inspector = sa.inspect(op.get_bind())
    if LEGACY_AUTH_TABLE in inspector.get_table_names():
        op.drop_table(LEGACY_AUTH_TABLE)


def downgrade() -> None:
    pass
