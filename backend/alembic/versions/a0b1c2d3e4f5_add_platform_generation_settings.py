"""add platform generation settings

Revision ID: a0b1c2d3e4f5
Revises: 9d1e2f3a4b5c
Create Date: 2026-07-12 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "a0b1c2d3e4f5"
down_revision: Union[str, Sequence[str], None] = "9d1e2f3a4b5c"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "platformgenerationsettings",
        sa.Column("key", sa.String(length=40), nullable=False),
        sa.Column("notebook_provider", sa.String(length=17), nullable=False),
        sa.Column("updated_by_user_id", sa.Uuid(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["updated_by_user_id"], ["user.id"]),
        sa.PrimaryKeyConstraint("key"),
    )
    op.create_index(
        "ix_platformgenerationsettings_notebook_provider",
        "platformgenerationsettings",
        ["notebook_provider"],
        unique=False,
    )
    op.create_index(
        "ix_platformgenerationsettings_updated_by_user_id",
        "platformgenerationsettings",
        ["updated_by_user_id"],
        unique=False,
    )
    op.execute(
        "INSERT INTO platformgenerationsettings "
        "(key, notebook_provider, created_at, updated_at) "
        "VALUES ('global', 'open_notebook', now(), now())"
    )


def downgrade() -> None:
    op.drop_index(
        "ix_platformgenerationsettings_updated_by_user_id",
        table_name="platformgenerationsettings",
    )
    op.drop_index(
        "ix_platformgenerationsettings_notebook_provider",
        table_name="platformgenerationsettings",
    )
    op.drop_table("platformgenerationsettings")
