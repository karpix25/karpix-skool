"""add free_group_link to tenant

Revision ID: f6a7b8c9d0e2
Revises: e5a9c1d2f3b4
Create Date: 2026-07-06 00:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
import sqlmodel
from alembic import op


# revision identifiers, used by Alembic.
revision: str = "f6a7b8c9d0e2"
down_revision: Union[str, Sequence[str], None] = "e5a9c1d2f3b4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "tenant",
        sa.Column("free_group_link", sqlmodel.sql.sqltypes.AutoString(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("tenant", "free_group_link")
