"""add_owner_to_memberrole_enum

Revision ID: a1b2c3d4e5f6
Revises: 7e2d9a3b1c4d
Create Date: 2026-02-16 01:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
from sqlalchemy import text


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = '7e2d9a3b1c4d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Check if 'owner' already exists in the enum before adding
    conn = op.get_bind()
    result = conn.execute(text(
        "SELECT 1 FROM pg_enum WHERE enumlabel = 'owner' "
        "AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'memberrole')"
    ))
    if not result.fetchone():
        # Must commit current transaction first, then add enum value outside tx
        conn.execute(text("COMMIT"))
        conn.execute(text("ALTER TYPE memberrole ADD VALUE 'owner'"))
        # Start a new transaction for Alembic to close cleanly
        conn.execute(text("BEGIN"))


def downgrade() -> None:
    # PostgreSQL does not support removing values from an enum type.
    pass
