"""add xp event ledger

Revision ID: f2a4b6c8d0e1
Revises: 4ffc1d5caba6
Create Date: 2026-07-02 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f2a4b6c8d0e1'
down_revision: Union[str, Sequence[str], None] = '4ffc1d5caba6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'xpevent',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('tenant_id', sa.Uuid(), nullable=False),
        sa.Column('user_id', sa.Uuid(), nullable=False),
        sa.Column('source_type', sa.String(length=50), nullable=False),
        sa.Column('source_id', sa.String(length=255), nullable=False),
        sa.Column('points', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('idempotency_key', sa.String(length=255), nullable=False),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenant.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['user.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('idempotency_key', name='uq_xpevent_idempotency_key'),
    )
    op.create_index(
        'ix_xpevent_tenant_user_created_at',
        'xpevent',
        ['tenant_id', 'user_id', 'created_at'],
        unique=False,
    )
    op.create_index(
        'ix_xpevent_source',
        'xpevent',
        ['source_type', 'source_id'],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index('ix_xpevent_source', table_name='xpevent')
    op.drop_index('ix_xpevent_tenant_user_created_at', table_name='xpevent')
    op.drop_table('xpevent')
