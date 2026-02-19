"""add telegram_topic_id and is_onboarded columns

Revision ID: b7f4a2c8d9e1
Revises: d31ff3246baf
Create Date: 2026-02-19 10:20:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel


# revision identifiers, used by Alembic.
revision: str = 'b7f4a2c8d9e1'
down_revision: Union[str, Sequence[str], None] = 'd31ff3246baf'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Tenant: telegram_topic_id columns (IF NOT EXISTS for safety)
    op.execute("ALTER TABLE tenant ADD COLUMN IF NOT EXISTS telegram_topic_id BIGINT")
    op.execute("ALTER TABLE tenant ADD COLUMN IF NOT EXISTS telegram_topic_id_vip BIGINT")
    
    # User: is_onboarded
    op.execute("ALTER TABLE \"user\" ADD COLUMN IF NOT EXISTS is_onboarded BOOLEAN DEFAULT FALSE")
    
    # TenantMember: is_onboarded
    op.execute("ALTER TABLE tenantmember ADD COLUMN IF NOT EXISTS is_onboarded BOOLEAN DEFAULT FALSE")


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('tenantmember', 'is_onboarded')
    op.drop_column('user', 'is_onboarded')
    op.drop_column('tenant', 'telegram_topic_id_vip')
    op.drop_column('tenant', 'telegram_topic_id')
