"""hash desktop magic tokens

Revision ID: e5a9c1d2f3b4
Revises: d4e5f6a7b8c9
Create Date: 2026-07-06 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "e5a9c1d2f3b4"
down_revision: Union[str, Sequence[str], None] = "d4e5f6a7b8c9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Rename raw desktop token storage to hash storage."""
    op.execute("DROP INDEX IF EXISTS ix_onetimetoken_token")
    op.alter_column(
        "onetimetoken",
        "token",
        new_column_name="token_hash",
        existing_type=sa.String(),
        existing_nullable=False,
    )
    op.alter_column(
        "onetimetoken",
        "token_hash",
        type_=sa.String(length=64),
        existing_type=sa.String(),
        existing_nullable=False,
    )
    op.execute("UPDATE onetimetoken SET used_at = NOW() WHERE used_at IS NULL")
    op.execute(
        "UPDATE onetimetoken "
        "SET token_hash = repeat('0', 32) || replace(id::text, '-', '')"
    )
    op.create_index(
        op.f("ix_onetimetoken_token_hash"),
        "onetimetoken",
        ["token_hash"],
        unique=True,
    )


def downgrade() -> None:
    """Restore previous raw token column name."""
    op.drop_index(op.f("ix_onetimetoken_token_hash"), table_name="onetimetoken")
    op.alter_column(
        "onetimetoken",
        "token_hash",
        type_=sa.String(),
        existing_type=sa.String(length=64),
        existing_nullable=False,
    )
    op.alter_column(
        "onetimetoken",
        "token_hash",
        new_column_name="token",
        existing_type=sa.String(),
        existing_nullable=False,
    )
    op.create_index(op.f("ix_onetimetoken_token"), "onetimetoken", ["token"], unique=True)
