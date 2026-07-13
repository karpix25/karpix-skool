from datetime import datetime
from typing import Any, Optional
import uuid

from pydantic import BaseModel, ConfigDict, Field, field_validator

from ..models_quizzes import QuizQuestionType


class QuizOptionPayload(BaseModel):
    text: str = Field(min_length=1, max_length=2000)
    is_correct: bool = False
    order_index: int = 0


class QuizQuestionPayload(BaseModel):
    text: str = Field(min_length=1, max_length=2000)
    question_type: QuizQuestionType
    explanation: Optional[str] = Field(default=None, max_length=4000)
    order_index: int = 0
    options: list[QuizOptionPayload] = Field(default_factory=list)


class LessonQuizUpsert(BaseModel):
    is_enabled: bool = False
    is_required: bool = False
    passing_score_percent: int = Field(default=70, ge=0, le=100)
    allow_retries: bool = True
    questions: list[QuizQuestionPayload] = Field(default_factory=list)

    @field_validator("questions")
    @classmethod
    def validate_question_payloads(
        cls,
        questions: list[QuizQuestionPayload],
    ) -> list[QuizQuestionPayload]:
        for question in questions:
            if question.question_type in {
                QuizQuestionType.single_choice,
                QuizQuestionType.multiple_choice,
            } and not question.options:
                raise ValueError("Choice questions require options")
            if question.question_type == QuizQuestionType.single_choice:
                correct_count = sum(1 for option in question.options if option.is_correct)
                if correct_count != 1:
                    raise ValueError("single_choice questions require exactly one correct option")
            if question.question_type == QuizQuestionType.multiple_choice:
                if not any(option.is_correct for option in question.options):
                    raise ValueError("multiple_choice questions require at least one correct option")
            if question.question_type == QuizQuestionType.short_text:
                if not any(option.is_correct and option.text.strip() for option in question.options):
                    raise ValueError("short_text questions require at least one correct text option")
        return questions


class LessonQuizGenerateRequest(BaseModel):
    replace_existing: bool = False


class QuizOptionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    text: str
    is_correct: bool
    order_index: int


class QuizQuestionRead(BaseModel):
    id: uuid.UUID
    text: str
    question_type: QuizQuestionType
    explanation: Optional[str]
    order_index: int
    options: list[QuizOptionRead]


class LessonQuizRead(BaseModel):
    id: uuid.UUID
    lesson_id: uuid.UUID
    is_enabled: bool
    is_required: bool
    passing_score_percent: int
    allow_retries: bool
    questions: list[QuizQuestionRead]


class StudentQuizOptionRead(BaseModel):
    id: uuid.UUID
    text: str
    order_index: int


class StudentQuizQuestionRead(BaseModel):
    id: uuid.UUID
    text: str
    question_type: QuizQuestionType
    explanation: Optional[str]
    order_index: int
    options: list[StudentQuizOptionRead]


class StudentQuizRead(BaseModel):
    id: uuid.UUID
    lesson_id: uuid.UUID
    is_required: bool
    passing_score_percent: int
    allow_retries: bool
    questions: list[StudentQuizQuestionRead]


class QuizAttemptSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    score_percent: int
    passed: bool
    created_at: datetime


class StudentLessonQuizResponse(BaseModel):
    quiz: Optional[StudentQuizRead]
    latest_attempt: Optional[QuizAttemptSummary] = None


class QuizAnswerSubmission(BaseModel):
    question_id: uuid.UUID
    selected_option_ids: list[uuid.UUID] = Field(default_factory=list)
    text_answer: Optional[str] = None


class QuizAttemptCreate(BaseModel):
    answers: list[QuizAnswerSubmission] = Field(default_factory=list)


class QuizQuestionResultRead(BaseModel):
    question_id: uuid.UUID
    question_type: QuizQuestionType
    is_correct: bool
    explanation: Optional[str] = None
    selected_option_ids: list[uuid.UUID] = Field(default_factory=list)
    submitted_text: Optional[str] = None
    correct_option_ids: list[uuid.UUID] = Field(default_factory=list)


class QuizAttemptResponse(BaseModel):
    attempt_id: uuid.UUID
    score_percent: int
    passed: bool
    correct_count: int
    total_questions: int
    question_results: list[QuizQuestionResultRead]
    completion_result: Optional[dict[str, Any]] = None
