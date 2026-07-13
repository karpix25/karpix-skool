import uuid

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from ..db import get_session
from ..models import Lesson, User
from ..models_quizzes import LessonQuiz, QuizOption, QuizQuestion, QuizQuestionType
from ..schemas.quizzes import (
    QuizAnswerSubmission,
    QuizAttemptCreate,
    QuizAttemptResponse,
    QuizAttemptSummary,
    StudentLessonQuizResponse,
    StudentQuizRead,
)
from ..services.quizzes.quiz_attempts import get_latest_attempt, submit_quiz_attempt
from ..services.webapp.lesson_access import get_lesson_access_state
from .auth import get_current_user

router = APIRouter()


@router.get("/lessons/{lesson_id}/quiz", response_model=StudentLessonQuizResponse)
async def get_student_lesson_quiz(
    lesson_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    lesson, quiz = await _get_available_quiz(
        lesson_id=lesson_id,
        session=session,
        current_user=current_user,
    )
    if not quiz:
        return StudentLessonQuizResponse(quiz=None)

    latest_attempt = await get_latest_attempt(
        session=session,
        quiz_id=quiz.id,
        user_id=current_user.id,
    )
    return StudentLessonQuizResponse(
        quiz=await _build_student_quiz_read(session=session, quiz=quiz),
        latest_attempt=QuizAttemptSummary.model_validate(latest_attempt) if latest_attempt else None,
    )


@router.post("/lessons/{lesson_id}/quiz/attempts", response_model=QuizAttemptResponse)
async def submit_student_lesson_quiz_attempt(
    lesson_id: uuid.UUID,
    payload: QuizAttemptCreate,
    background_tasks: BackgroundTasks,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    lesson, quiz = await _get_available_quiz(
        lesson_id=lesson_id,
        session=session,
        current_user=current_user,
    )
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")

    questions = await _get_questions(session=session, quiz_id=quiz.id)
    options_by_question = {
        question.id: await _get_options(session=session, question_id=question.id)
        for question in questions
    }
    _validate_answers_belong_to_quiz(
        questions=questions,
        options_by_question=options_by_question,
        answers=payload.answers,
    )
    return await submit_quiz_attempt(
        session=session,
        lesson=lesson,
        quiz=quiz,
        questions=questions,
        options_by_question=options_by_question,
        answers=payload.answers,
        background_tasks=background_tasks,
        current_user=current_user,
    )


async def _get_available_quiz(
    *,
    lesson_id: uuid.UUID,
    session: AsyncSession,
    current_user: User,
) -> tuple[Lesson, LessonQuiz | None]:
    lesson = await session.get(Lesson, lesson_id)
    if not lesson or lesson.deleted_at or not lesson.is_published:
        raise HTTPException(status_code=404, detail="Lesson not found")

    access = await get_lesson_access_state(
        session=session,
        lesson=lesson,
        current_user=current_user,
        require_membership=True,
    )
    if access.is_locked:
        raise HTTPException(status_code=403, detail=access.lock_reason or "Lesson is locked")

    result = await session.exec(
        select(LessonQuiz).where(
            LessonQuiz.lesson_id == lesson.id,
            LessonQuiz.is_enabled == True,
        )
    )
    return lesson, result.first()


async def _build_student_quiz_read(
    *,
    session: AsyncSession,
    quiz: LessonQuiz,
) -> StudentQuizRead:
    questions = await _get_questions(session=session, quiz_id=quiz.id)
    return StudentQuizRead(
        id=quiz.id,
        lesson_id=quiz.lesson_id,
        is_required=quiz.is_required,
        passing_score_percent=quiz.passing_score_percent,
        allow_retries=quiz.allow_retries,
        questions=[
            {
                "id": question.id,
                "text": question.text,
                "question_type": question.question_type,
                "explanation": question.explanation,
                "order_index": question.order_index,
                "options": await _build_student_options(session=session, question=question),
            }
            for question in questions
        ],
    )


async def _get_questions(
    *,
    session: AsyncSession,
    quiz_id: uuid.UUID,
) -> list[QuizQuestion]:
    result = await session.exec(
        select(QuizQuestion)
        .where(QuizQuestion.quiz_id == quiz_id)
        .order_by(QuizQuestion.order_index, QuizQuestion.created_at)
    )
    return list(result.all())


async def _get_options(
    *,
    session: AsyncSession,
    question_id: uuid.UUID,
) -> list[QuizOption]:
    result = await session.exec(
        select(QuizOption)
        .where(QuizOption.question_id == question_id)
        .order_by(QuizOption.order_index, QuizOption.created_at)
    )
    return list(result.all())


async def _build_student_options(
    *,
    session: AsyncSession,
    question: QuizQuestion,
) -> list[dict]:
    if question.question_type == QuizQuestionType.short_text:
        return []
    return [
        {
            "id": option.id,
            "text": option.text,
            "order_index": option.order_index,
        }
        for option in await _get_options(session=session, question_id=question.id)
    ]


def _validate_answers_belong_to_quiz(
    *,
    questions: list[QuizQuestion],
    options_by_question: dict[uuid.UUID, list[QuizOption]],
    answers: list[QuizAnswerSubmission],
) -> None:
    valid_question_ids = {question.id for question in questions}
    answer_question_ids = {answer.question_id for answer in answers}
    if not answer_question_ids.issubset(valid_question_ids):
        raise HTTPException(status_code=422, detail="Answer contains unknown question_id")

    option_ids_by_question = {
        question_id: {option.id for option in options}
        for question_id, options in options_by_question.items()
    }
    for answer in answers:
        valid_option_ids = option_ids_by_question.get(answer.question_id, set())
        if not set(answer.selected_option_ids).issubset(valid_option_ids):
            raise HTTPException(status_code=422, detail="Answer contains unknown option_id")
