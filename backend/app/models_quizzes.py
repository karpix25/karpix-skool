from datetime import datetime
from enum import Enum
from typing import Any, Optional
import uuid

import sqlalchemy as sa
from sqlmodel import Field, SQLModel


class QuizQuestionType(str, Enum):
    single_choice = "single_choice"
    multiple_choice = "multiple_choice"
    short_text = "short_text"


class LessonQuiz(SQLModel, table=True):
    __table_args__ = (
        sa.Index("ix_lessonquiz_lesson_active", "lesson_id", "is_enabled"),
    )

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    lesson_id: uuid.UUID = Field(foreign_key="lesson.id", index=True, unique=True)
    is_enabled: bool = Field(default=False, index=True)
    is_required: bool = Field(default=False, index=True)
    passing_score_percent: int = Field(default=70)
    allow_retries: bool = Field(default=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class QuizQuestion(SQLModel, table=True):
    __table_args__ = (
        sa.Index("ix_quizquestion_quiz_order", "quiz_id", "order_index"),
    )

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    quiz_id: uuid.UUID = Field(foreign_key="lessonquiz.id", index=True)
    text: str = Field(max_length=2000)
    question_type: QuizQuestionType = Field(default=QuizQuestionType.single_choice, index=True)
    explanation: Optional[str] = Field(default=None, max_length=4000)
    order_index: int = Field(default=0, index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class QuizOption(SQLModel, table=True):
    __table_args__ = (
        sa.Index("ix_quizoption_question_order", "question_id", "order_index"),
    )

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    question_id: uuid.UUID = Field(foreign_key="quizquestion.id", index=True)
    text: str = Field(max_length=2000)
    is_correct: bool = Field(default=False, index=True)
    order_index: int = Field(default=0, index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class QuizAttempt(SQLModel, table=True):
    __table_args__ = (
        sa.Index("ix_quizattempt_user_lesson_recent", "user_id", "lesson_id", sa.text("created_at DESC")),
        sa.Index("ix_quizattempt_quiz_user_recent", "quiz_id", "user_id", sa.text("created_at DESC")),
    )

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    quiz_id: uuid.UUID = Field(foreign_key="lessonquiz.id", index=True)
    lesson_id: uuid.UUID = Field(foreign_key="lesson.id", index=True)
    user_id: uuid.UUID = Field(foreign_key="user.id", index=True)
    score_percent: int = Field(default=0, index=True)
    passed: bool = Field(default=False, index=True)
    answers: list[dict[str, Any]] = Field(default_factory=list, sa_type=sa.JSON)
    question_results: list[dict[str, Any]] = Field(default_factory=list, sa_type=sa.JSON)
    created_at: datetime = Field(default_factory=datetime.utcnow, index=True)
