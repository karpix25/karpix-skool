"""add tenant welcome video

Revision ID: 7b8c9d0e1f2a
Revises: 9c0d1e2f3a4b
Create Date: 2026-07-11 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel


# revision identifiers, used by Alembic.
revision: str = "7b8c9d0e1f2a"
down_revision: Union[str, Sequence[str], None] = "9c0d1e2f3a4b"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "tenant",
        sa.Column("welcome_video_enabled", sa.Boolean(), server_default=sa.false(), nullable=False),
    )
    op.add_column(
        "tenant",
        sa.Column("welcome_video_url", sqlmodel.sql.sqltypes.AutoString(), nullable=True),
    )
    op.add_column(
        "tenant",
        sa.Column("welcome_video_title", sqlmodel.sql.sqltypes.AutoString(), nullable=True),
    )
    op.add_column(
        "tenant",
        sa.Column("welcome_video_description", sqlmodel.sql.sqltypes.AutoString(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("tenant", "welcome_video_description")
    op.drop_column("tenant", "welcome_video_title")
    op.drop_column("tenant", "welcome_video_url")
    op.drop_column("tenant", "welcome_video_enabled")
