"""add mux_upload_id to lesson

Revision ID: 7e2d9a3b1c4d
Revises: 9b959ba4060b
Create Date: 2026-02-14 13:35:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
import sqlmodel

# revision identifiers, used by Alembic.
revision: str = '7e2d9a3b1c4d'
down_revision: Union[str, Sequence[str], None] = '9b959ba4060b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    # Use batch_alter_table for SQLite compatibility if needed, 
    # but here we use standard op.add_column for Postgres.
    op.add_column('lesson', sa.Column('mux_upload_id', sqlmodel.sql.sqltypes.AutoString(), nullable=True))

def downgrade() -> None:
    op.drop_column('lesson', 'mux_upload_id')
