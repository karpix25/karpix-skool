"""add lesson quizzes

Revision ID: 9d1e2f3a4b5c
Revises: 8d9e0f1a2b3c
Create Date: 2026-07-12 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "9d1e2f3a4b5c"
down_revision: Union[str, Sequence[str], None] = "8d9e0f1a2b3c"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

question_type = sa.Enum("single_choice", "multiple_choice", "short_text", name="quizquestiontype")


def upgrade() -> None:
    question_type.create(op.get_bind(), checkfirst=True)
    op.create_table(
        "lessonquiz",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("lesson_id", sa.Uuid(), nullable=False),
        sa.Column("is_enabled", sa.Boolean(), nullable=False),
        sa.Column("is_required", sa.Boolean(), nullable=False),
        sa.Column("passing_score_percent", sa.Integer(), nullable=False),
        sa.Column("allow_retries", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["lesson_id"], ["lesson.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("lesson_id"),
    )
    op.create_index("ix_lessonquiz_is_enabled", "lessonquiz", ["is_enabled"])
    op.create_index("ix_lessonquiz_is_required", "lessonquiz", ["is_required"])
    op.create_index("ix_lessonquiz_lesson_active", "lessonquiz", ["lesson_id", "is_enabled"])
    op.create_index("ix_lessonquiz_lesson_id", "lessonquiz", ["lesson_id"])

    op.create_table(
        "quizquestion",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("quiz_id", sa.Uuid(), nullable=False),
        sa.Column("text", sa.String(length=2000), nullable=False),
        sa.Column("question_type", question_type, nullable=False),
        sa.Column("explanation", sa.String(length=4000), nullable=True),
        sa.Column("order_index", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["quiz_id"], ["lessonquiz.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_quizquestion_question_type", "quizquestion", ["question_type"])
    op.create_index("ix_quizquestion_quiz_id", "quizquestion", ["quiz_id"])
    op.create_index("ix_quizquestion_quiz_order", "quizquestion", ["quiz_id", "order_index"])
    op.create_index("ix_quizquestion_order_index", "quizquestion", ["order_index"])

    op.create_table(
        "quizoption",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("question_id", sa.Uuid(), nullable=False),
        sa.Column("text", sa.String(length=2000), nullable=False),
        sa.Column("is_correct", sa.Boolean(), nullable=False),
        sa.Column("order_index", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["question_id"], ["quizquestion.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_quizoption_is_correct", "quizoption", ["is_correct"])
    op.create_index("ix_quizoption_order_index", "quizoption", ["order_index"])
    op.create_index("ix_quizoption_question_id", "quizoption", ["question_id"])
    op.create_index("ix_quizoption_question_order", "quizoption", ["question_id", "order_index"])

    op.create_table(
        "quizattempt",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("quiz_id", sa.Uuid(), nullable=False),
        sa.Column("lesson_id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("score_percent", sa.Integer(), nullable=False),
        sa.Column("passed", sa.Boolean(), nullable=False),
        sa.Column("answers", sa.JSON(), nullable=False),
        sa.Column("question_results", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["lesson_id"], ["lesson.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["quiz_id"], ["lessonquiz.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["user.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_quizattempt_created_at", "quizattempt", ["created_at"])
    op.create_index("ix_quizattempt_lesson_id", "quizattempt", ["lesson_id"])
    op.create_index("ix_quizattempt_passed", "quizattempt", ["passed"])
    op.create_index("ix_quizattempt_quiz_id", "quizattempt", ["quiz_id"])
    op.create_index("ix_quizattempt_quiz_user_recent", "quizattempt", ["quiz_id", "user_id", sa.text("created_at DESC")])
    op.create_index("ix_quizattempt_score_percent", "quizattempt", ["score_percent"])
    op.create_index("ix_quizattempt_user_id", "quizattempt", ["user_id"])
    op.create_index("ix_quizattempt_user_lesson_recent", "quizattempt", ["user_id", "lesson_id", sa.text("created_at DESC")])


def downgrade() -> None:
    op.drop_index("ix_quizattempt_user_lesson_recent", table_name="quizattempt")
    op.drop_index("ix_quizattempt_user_id", table_name="quizattempt")
    op.drop_index("ix_quizattempt_score_percent", table_name="quizattempt")
    op.drop_index("ix_quizattempt_quiz_user_recent", table_name="quizattempt")
    op.drop_index("ix_quizattempt_quiz_id", table_name="quizattempt")
    op.drop_index("ix_quizattempt_passed", table_name="quizattempt")
    op.drop_index("ix_quizattempt_lesson_id", table_name="quizattempt")
    op.drop_index("ix_quizattempt_created_at", table_name="quizattempt")
    op.drop_table("quizattempt")
    op.drop_index("ix_quizoption_question_order", table_name="quizoption")
    op.drop_index("ix_quizoption_question_id", table_name="quizoption")
    op.drop_index("ix_quizoption_order_index", table_name="quizoption")
    op.drop_index("ix_quizoption_is_correct", table_name="quizoption")
    op.drop_table("quizoption")
    op.drop_index("ix_quizquestion_order_index", table_name="quizquestion")
    op.drop_index("ix_quizquestion_quiz_order", table_name="quizquestion")
    op.drop_index("ix_quizquestion_quiz_id", table_name="quizquestion")
    op.drop_index("ix_quizquestion_question_type", table_name="quizquestion")
    op.drop_table("quizquestion")
    op.drop_index("ix_lessonquiz_lesson_id", table_name="lessonquiz")
    op.drop_index("ix_lessonquiz_lesson_active", table_name="lessonquiz")
    op.drop_index("ix_lessonquiz_is_required", table_name="lessonquiz")
    op.drop_index("ix_lessonquiz_is_enabled", table_name="lessonquiz")
    op.drop_table("lessonquiz")
    question_type.drop(op.get_bind(), checkfirst=True)
