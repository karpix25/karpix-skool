"""add platform leads

Revision ID: b9c8d7e6f5a4
Revises: a8f1c2d3e4b5
Create Date: 2026-07-04 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'b9c8d7e6f5a4'
down_revision: Union[str, Sequence[str], None] = 'a8f1c2d3e4b5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


platform_lead_status = postgresql.ENUM(
    'new',
    'in_progress',
    'approved',
    'rejected',
    'archived',
    name='platformleadstatus',
)


def upgrade() -> None:
    """Upgrade schema."""
    platform_lead_status.create(op.get_bind(), checkfirst=True)
    op.create_table(
        'platformlead',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('name', sa.String(length=120), nullable=False),
        sa.Column('telegram', sa.String(length=80), nullable=False),
        sa.Column('school_name', sa.String(length=160), nullable=False),
        sa.Column('description', sa.String(length=2000), nullable=False),
        sa.Column(
            'status',
            postgresql.ENUM(
                'new',
                'in_progress',
                'approved',
                'rejected',
                'archived',
                name='platformleadstatus',
                create_type=False,
            ),
            nullable=False,
        ),
        sa.Column('admin_note', sa.String(length=2000), nullable=True),
        sa.Column('handled_by_user_id', sa.Uuid(), nullable=True),
        sa.Column('handled_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.Column('deleted_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['handled_by_user_id'], ['user.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_platformlead_created_at'), 'platformlead', ['created_at'], unique=False)
    op.create_index(op.f('ix_platformlead_deleted_at'), 'platformlead', ['deleted_at'], unique=False)
    op.create_index(op.f('ix_platformlead_handled_by_user_id'), 'platformlead', ['handled_by_user_id'], unique=False)
    op.create_index(op.f('ix_platformlead_school_name'), 'platformlead', ['school_name'], unique=False)
    op.create_index(op.f('ix_platformlead_status'), 'platformlead', ['status'], unique=False)
    op.create_index('ix_platformlead_status_created_at', 'platformlead', ['status', sa.text('created_at DESC')], unique=False)
    op.create_index(op.f('ix_platformlead_telegram'), 'platformlead', ['telegram'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_platformlead_telegram'), table_name='platformlead')
    op.drop_index('ix_platformlead_status_created_at', table_name='platformlead')
    op.drop_index(op.f('ix_platformlead_status'), table_name='platformlead')
    op.drop_index(op.f('ix_platformlead_school_name'), table_name='platformlead')
    op.drop_index(op.f('ix_platformlead_handled_by_user_id'), table_name='platformlead')
    op.drop_index(op.f('ix_platformlead_deleted_at'), table_name='platformlead')
    op.drop_index(op.f('ix_platformlead_created_at'), table_name='platformlead')
    op.drop_table('platformlead')
    platform_lead_status.drop(op.get_bind(), checkfirst=True)
