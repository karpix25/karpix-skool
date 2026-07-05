"""add course subscriptions

Revision ID: c7d8e9f0a1b2
Revises: b9c8d7e6f5a4
Create Date: 2026-07-04 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'c7d8e9f0a1b2'
down_revision: Union[str, Sequence[str], None] = 'b9c8d7e6f5a4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


course_notification_event_type = postgresql.ENUM(
    'lesson_published',
    'module_published',
    name='coursenotificationeventtype',
)

course_notification_delivery_status = postgresql.ENUM(
    'pending',
    'sent',
    'skipped',
    'failed',
    name='coursenotificationdeliverystatus',
)


def upgrade() -> None:
    """Upgrade schema."""
    course_notification_event_type.create(op.get_bind(), checkfirst=True)
    course_notification_delivery_status.create(op.get_bind(), checkfirst=True)

    op.create_table(
        'coursesubscription',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('tenant_id', sa.Uuid(), nullable=False),
        sa.Column('course_id', sa.Uuid(), nullable=False),
        sa.Column('user_id', sa.Uuid(), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['course_id'], ['course.id']),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenant.id']),
        sa.ForeignKeyConstraint(['user_id'], ['user.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id', 'course_id', name='uq_coursesubscription_user_course'),
    )
    op.create_index(op.f('ix_coursesubscription_course_id'), 'coursesubscription', ['course_id'], unique=False)
    op.create_index('ix_coursesubscription_course_active', 'coursesubscription', ['course_id', 'is_active'], unique=False)
    op.create_index(op.f('ix_coursesubscription_created_at'), 'coursesubscription', ['created_at'], unique=False)
    op.create_index(op.f('ix_coursesubscription_is_active'), 'coursesubscription', ['is_active'], unique=False)
    op.create_index(op.f('ix_coursesubscription_tenant_id'), 'coursesubscription', ['tenant_id'], unique=False)
    op.create_index('ix_coursesubscription_tenant_user', 'coursesubscription', ['tenant_id', 'user_id'], unique=False)
    op.create_index(op.f('ix_coursesubscription_user_id'), 'coursesubscription', ['user_id'], unique=False)

    op.create_table(
        'coursenotificationdelivery',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('tenant_id', sa.Uuid(), nullable=False),
        sa.Column('course_id', sa.Uuid(), nullable=False),
        sa.Column('user_id', sa.Uuid(), nullable=False),
        sa.Column(
            'event_type',
            postgresql.ENUM(
                'lesson_published',
                'module_published',
                name='coursenotificationeventtype',
                create_type=False,
            ),
            nullable=False,
        ),
        sa.Column('idempotency_key', sa.String(length=255), nullable=False),
        sa.Column('module_id', sa.Uuid(), nullable=True),
        sa.Column('lesson_id', sa.Uuid(), nullable=True),
        sa.Column(
            'status',
            postgresql.ENUM(
                'pending',
                'sent',
                'skipped',
                'failed',
                name='coursenotificationdeliverystatus',
                create_type=False,
            ),
            nullable=False,
        ),
        sa.Column('error', sa.String(length=1000), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('sent_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['course_id'], ['course.id']),
        sa.ForeignKeyConstraint(['lesson_id'], ['lesson.id']),
        sa.ForeignKeyConstraint(['module_id'], ['module.id']),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenant.id']),
        sa.ForeignKeyConstraint(['user_id'], ['user.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('idempotency_key', name='uq_coursenotificationdelivery_key'),
    )
    op.create_index(op.f('ix_coursenotificationdelivery_course_id'), 'coursenotificationdelivery', ['course_id'], unique=False)
    op.create_index('ix_coursenotificationdelivery_course_event', 'coursenotificationdelivery', ['course_id', 'event_type'], unique=False)
    op.create_index(op.f('ix_coursenotificationdelivery_created_at'), 'coursenotificationdelivery', ['created_at'], unique=False)
    op.create_index(op.f('ix_coursenotificationdelivery_event_type'), 'coursenotificationdelivery', ['event_type'], unique=False)
    op.create_index(op.f('ix_coursenotificationdelivery_idempotency_key'), 'coursenotificationdelivery', ['idempotency_key'], unique=False)
    op.create_index(op.f('ix_coursenotificationdelivery_lesson_id'), 'coursenotificationdelivery', ['lesson_id'], unique=False)
    op.create_index(op.f('ix_coursenotificationdelivery_module_id'), 'coursenotificationdelivery', ['module_id'], unique=False)
    op.create_index(op.f('ix_coursenotificationdelivery_sent_at'), 'coursenotificationdelivery', ['sent_at'], unique=False)
    op.create_index(op.f('ix_coursenotificationdelivery_status'), 'coursenotificationdelivery', ['status'], unique=False)
    op.create_index(op.f('ix_coursenotificationdelivery_tenant_id'), 'coursenotificationdelivery', ['tenant_id'], unique=False)
    op.create_index(op.f('ix_coursenotificationdelivery_user_id'), 'coursenotificationdelivery', ['user_id'], unique=False)
    op.create_index('ix_coursenotificationdelivery_user_status', 'coursenotificationdelivery', ['user_id', 'status'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index('ix_coursenotificationdelivery_user_status', table_name='coursenotificationdelivery')
    op.drop_index(op.f('ix_coursenotificationdelivery_user_id'), table_name='coursenotificationdelivery')
    op.drop_index(op.f('ix_coursenotificationdelivery_tenant_id'), table_name='coursenotificationdelivery')
    op.drop_index(op.f('ix_coursenotificationdelivery_status'), table_name='coursenotificationdelivery')
    op.drop_index(op.f('ix_coursenotificationdelivery_sent_at'), table_name='coursenotificationdelivery')
    op.drop_index(op.f('ix_coursenotificationdelivery_module_id'), table_name='coursenotificationdelivery')
    op.drop_index(op.f('ix_coursenotificationdelivery_lesson_id'), table_name='coursenotificationdelivery')
    op.drop_index(op.f('ix_coursenotificationdelivery_idempotency_key'), table_name='coursenotificationdelivery')
    op.drop_index(op.f('ix_coursenotificationdelivery_event_type'), table_name='coursenotificationdelivery')
    op.drop_index(op.f('ix_coursenotificationdelivery_created_at'), table_name='coursenotificationdelivery')
    op.drop_index('ix_coursenotificationdelivery_course_event', table_name='coursenotificationdelivery')
    op.drop_index(op.f('ix_coursenotificationdelivery_course_id'), table_name='coursenotificationdelivery')
    op.drop_table('coursenotificationdelivery')

    op.drop_index(op.f('ix_coursesubscription_user_id'), table_name='coursesubscription')
    op.drop_index('ix_coursesubscription_tenant_user', table_name='coursesubscription')
    op.drop_index(op.f('ix_coursesubscription_tenant_id'), table_name='coursesubscription')
    op.drop_index(op.f('ix_coursesubscription_is_active'), table_name='coursesubscription')
    op.drop_index(op.f('ix_coursesubscription_created_at'), table_name='coursesubscription')
    op.drop_index('ix_coursesubscription_course_active', table_name='coursesubscription')
    op.drop_index(op.f('ix_coursesubscription_course_id'), table_name='coursesubscription')
    op.drop_table('coursesubscription')

    course_notification_delivery_status.drop(op.get_bind(), checkfirst=True)
    course_notification_event_type.drop(op.get_bind(), checkfirst=True)
