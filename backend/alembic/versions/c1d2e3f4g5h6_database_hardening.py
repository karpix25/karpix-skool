"""database_hardening

Revision ID: c1d2e3f4g5h6
Revises: b7f4a2c8d9e1
Create Date: 2026-02-19 14:05:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel


# revision identifiers, used by Alembic.
revision: str = 'c1d2e3f4g5h6'
down_revision: Union[str, Sequence[str], None] = 'b7f4a2c8d9e1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Database hardening: constraints, cascades, triggers, cleanup."""

    # ================================================================
    # 1. UNIQUE constraint on LessonProgress(user_id, lesson_id)
    # ================================================================
    # Clean duplicates first (keep earliest by completed_at)
    op.execute("""
        DELETE FROM lessonprogress
        WHERE id NOT IN (
            SELECT DISTINCT ON (user_id, lesson_id) id
            FROM lessonprogress
            ORDER BY user_id, lesson_id, completed_at ASC
        )
    """)
    op.create_unique_constraint('uq_user_lesson', 'lessonprogress', ['user_id', 'lesson_id'])

    # ================================================================
    # 2. FK ON DELETE CASCADE / SET NULL
    # ================================================================
    
    # tenant.owner_user_id → SET NULL (don't delete school when owner is deleted)
    op.drop_constraint('tenant_owner_user_id_fkey', 'tenant', type_='foreignkey')
    op.create_foreign_key('tenant_owner_user_id_fkey', 'tenant', 'user',
                          ['owner_user_id'], ['id'], ondelete='SET NULL')

    # course → tenant CASCADE
    op.drop_constraint('course_tenant_id_fkey', 'course', type_='foreignkey')
    op.create_foreign_key('course_tenant_id_fkey', 'course', 'tenant',
                          ['tenant_id'], ['id'], ondelete='CASCADE')

    # module → course CASCADE
    op.drop_constraint('module_course_id_fkey', 'module', type_='foreignkey')
    op.create_foreign_key('module_course_id_fkey', 'module', 'course',
                          ['course_id'], ['id'], ondelete='CASCADE')

    # lesson → module CASCADE
    op.drop_constraint('lesson_module_id_fkey', 'lesson', type_='foreignkey')
    op.create_foreign_key('lesson_module_id_fkey', 'lesson', 'module',
                          ['module_id'], ['id'], ondelete='CASCADE')

    # lessonprogress → lesson CASCADE
    op.drop_constraint('lessonprogress_lesson_id_fkey', 'lessonprogress', type_='foreignkey')
    op.create_foreign_key('lessonprogress_lesson_id_fkey', 'lessonprogress', 'lesson',
                          ['lesson_id'], ['id'], ondelete='CASCADE')

    # lessonprogress → user CASCADE
    op.drop_constraint('lessonprogress_user_id_fkey', 'lessonprogress', type_='foreignkey')
    op.create_foreign_key('lessonprogress_user_id_fkey', 'lessonprogress', 'user',
                          ['user_id'], ['id'], ondelete='CASCADE')

    # tenantmember → tenant CASCADE
    op.drop_constraint('tenantmember_tenant_id_fkey', 'tenantmember', type_='foreignkey')
    op.create_foreign_key('tenantmember_tenant_id_fkey', 'tenantmember', 'tenant',
                          ['tenant_id'], ['id'], ondelete='CASCADE')

    # tenantmember → user CASCADE
    op.drop_constraint('tenantmember_user_id_fkey', 'tenantmember', type_='foreignkey')
    op.create_foreign_key('tenantmember_user_id_fkey', 'tenantmember', 'user',
                          ['user_id'], ['id'], ondelete='CASCADE')

    # messagestore → tenant CASCADE
    op.drop_constraint('messagestore_tenant_id_fkey', 'messagestore', type_='foreignkey')
    op.create_foreign_key('messagestore_tenant_id_fkey', 'messagestore', 'tenant',
                          ['tenant_id'], ['id'], ondelete='CASCADE')

    # messagestore → user CASCADE
    op.drop_constraint('messagestore_user_id_fkey', 'messagestore', type_='foreignkey')
    op.create_foreign_key('messagestore_user_id_fkey', 'messagestore', 'user',
                          ['user_id'], ['id'], ondelete='CASCADE')

    # ================================================================
    # 3. Auto-updating updated_at trigger
    # ================================================================
    op.execute("""
        CREATE OR REPLACE FUNCTION update_updated_at()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = NOW();
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
    """)

    for table in ['user', 'tenant', 'tenantmember', 'course', 'module', 'lesson']:
        quoted = f'"{table}"' if table == 'user' else table
        op.execute(f"""
            CREATE TRIGGER tr_{table}_updated_at
            BEFORE UPDATE ON {quoted}
            FOR EACH ROW EXECUTE FUNCTION update_updated_at();
        """)

    # ================================================================
    # 4. Drop redundant indexes
    # ================================================================
    # ix_messagestore_lookup duplicates uq_chat_message unique constraint
    op.execute("DROP INDEX IF EXISTS ix_messagestore_lookup")
    # ix_module_course_id is prefix of ix_module_order_course(course_id, order_index)
    op.execute("DROP INDEX IF EXISTS ix_module_course_id")
    # ix_lesson_module_id is prefix of ix_lesson_order_module(module_id, order_index)
    op.execute("DROP INDEX IF EXISTS ix_lesson_module_id")


def downgrade() -> None:
    """Reverse database hardening."""

    # 4. Recreate dropped indexes
    op.create_index('ix_lesson_module_id', 'lesson', ['module_id'])
    op.create_index('ix_module_course_id', 'module', ['course_id'])
    op.create_index('ix_messagestore_lookup', 'messagestore', ['chat_id', 'message_id'])

    # 3. Drop triggers and function
    for table in ['lesson', 'module', 'course', 'tenantmember', 'tenant', 'user']:
        quoted = f'"{table}"' if table == 'user' else table
        op.execute(f"DROP TRIGGER IF EXISTS tr_{table}_updated_at ON {quoted}")
    op.execute("DROP FUNCTION IF EXISTS update_updated_at()")

    # 2. Revert FK to no cascade (plain FK)
    for table, col, ref_table in [
        ('messagestore', 'user_id', 'user'),
        ('messagestore', 'tenant_id', 'tenant'),
        ('tenantmember', 'user_id', 'user'),
        ('tenantmember', 'tenant_id', 'tenant'),
        ('lessonprogress', 'user_id', 'user'),
        ('lessonprogress', 'lesson_id', 'lesson'),
        ('lesson', 'module_id', 'module'),
        ('module', 'course_id', 'course'),
        ('course', 'tenant_id', 'tenant'),
        ('tenant', 'owner_user_id', 'user'),
    ]:
        fk_name = f'{table}_{col}_fkey'
        op.drop_constraint(fk_name, table, type_='foreignkey')
        op.create_foreign_key(fk_name, table, ref_table, [col], ['id'])

    # 1. Drop unique constraint
    op.drop_constraint('uq_user_lesson', 'lessonprogress', type_='unique')
