"""add_performance_indexes

Revision ID: 68b919ba17c2
Revises: cfccdd3e7d81
Create Date: 2026-02-13 01:08:45.598620

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel


# revision identifiers, used by Alembic.
revision: str = '68b919ba17c2'
down_revision: Union[str, Sequence[str], None] = 'cfccdd3e7d81'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Composite index for ultra-fast progress tracking
    op.create_index(
        "ix_lessonprogress_user_id_lesson_id",
        "lessonprogress",
        ["user_id", "lesson_id"],
        unique=False
    )
    
    # 2. Index for published courses filtering
    op.create_index(
        "ix_course_is_published_tenant_id",
        "course",
        ["is_published", "tenant_id", "deleted_at"]
    )
    
    # 3. Order indexes for sorted retrieval
    # Note: These might already have simple indexes, we ensure they are efficient
    op.create_index("ix_module_order_course", "module", ["course_id", "order_index"])
    op.create_index("ix_lesson_order_module", "lesson", ["module_id", "order_index"])


def downgrade() -> None:
    op.drop_index("ix_lessonprogress_user_id_lesson_id", table_name="lessonprogress")
    op.drop_index("ix_course_is_published_tenant_id", table_name="course")
    op.drop_index("ix_module_order_course", table_name="module")
    op.drop_index("ix_lesson_order_module", table_name="lesson")
