"""add course open notebook id

Revision ID: 5c6d7e8f9a0b
Revises: 3b4c5d6e7f80
Create Date: 2026-07-08 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel


# revision identifiers, used by Alembic.
revision: str = "5c6d7e8f9a0b"
down_revision: Union[str, Sequence[str], None] = "3b4c5d6e7f80"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "course",
        sa.Column("open_notebook_id", sqlmodel.sql.sqltypes.AutoString(length=255), nullable=True),
    )
    op.create_index("ix_course_open_notebook_id", "course", ["open_notebook_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_course_open_notebook_id", table_name="course")
    op.drop_column("course", "open_notebook_id")
