"""add tenant setup tokens

Revision ID: a8f1c2d3e4b5
Revises: f2a4b6c8d0e1
Create Date: 2026-07-02 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'a8f1c2d3e4b5'
down_revision: Union[str, Sequence[str], None] = 'f2a4b6c8d0e1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


tenant_setup_scope = postgresql.ENUM(
    'owner_invite',
    'free_group_link',
    'vip_group_link',
    name='tenantsetupscope',
)


def upgrade() -> None:
    """Upgrade schema."""
    tenant_setup_scope.create(op.get_bind(), checkfirst=True)
    op.create_table(
        'tenantsetuptoken',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('tenant_id', sa.Uuid(), nullable=False),
        sa.Column('token_hash', sa.String(length=64), nullable=False),
        sa.Column(
            'scope',
            postgresql.ENUM(
                'owner_invite',
                'free_group_link',
                'vip_group_link',
                name='tenantsetupscope',
                create_type=False,
            ),
            nullable=False,
        ),
        sa.Column('expires_at', sa.DateTime(), nullable=False),
        sa.Column('used_at', sa.DateTime(), nullable=True),
        sa.Column('created_by_user_id', sa.Uuid(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['created_by_user_id'], ['user.id']),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenant.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('token_hash', name='uq_tenantsetuptoken_token_hash'),
    )
    op.create_index(op.f('ix_tenantsetuptoken_created_by_user_id'), 'tenantsetuptoken', ['created_by_user_id'], unique=False)
    op.create_index(op.f('ix_tenantsetuptoken_expires_at'), 'tenantsetuptoken', ['expires_at'], unique=False)
    op.create_index(op.f('ix_tenantsetuptoken_scope'), 'tenantsetuptoken', ['scope'], unique=False)
    op.create_index(op.f('ix_tenantsetuptoken_tenant_id'), 'tenantsetuptoken', ['tenant_id'], unique=False)
    op.create_index(
        'ix_tenantsetuptoken_tenant_scope_state',
        'tenantsetuptoken',
        ['tenant_id', 'scope', 'used_at', 'expires_at'],
        unique=False,
    )
    op.create_index(op.f('ix_tenantsetuptoken_token_hash'), 'tenantsetuptoken', ['token_hash'], unique=False)
    op.create_index(op.f('ix_tenantsetuptoken_used_at'), 'tenantsetuptoken', ['used_at'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_tenantsetuptoken_used_at'), table_name='tenantsetuptoken')
    op.drop_index(op.f('ix_tenantsetuptoken_token_hash'), table_name='tenantsetuptoken')
    op.drop_index('ix_tenantsetuptoken_tenant_scope_state', table_name='tenantsetuptoken')
    op.drop_index(op.f('ix_tenantsetuptoken_tenant_id'), table_name='tenantsetuptoken')
    op.drop_index(op.f('ix_tenantsetuptoken_scope'), table_name='tenantsetuptoken')
    op.drop_index(op.f('ix_tenantsetuptoken_expires_at'), table_name='tenantsetuptoken')
    op.drop_index(op.f('ix_tenantsetuptoken_created_by_user_id'), table_name='tenantsetuptoken')
    op.drop_table('tenantsetuptoken')
    tenant_setup_scope.drop(op.get_bind(), checkfirst=True)
