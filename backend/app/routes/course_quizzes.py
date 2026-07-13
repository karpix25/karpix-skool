from datetime import datetime
from typing import Optional
import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from ..db import get_session
from ..models import Course, Lesson, Module
from ..models_quizzes import LessonQuiz, QuizOption, QuizQuestion
from ..schemas.quizzes import LessonQuizRead, LessonQuizUpsert
from ..services.cache_invalidation import invalidate_course_write_caches
from ..utils.security import get_managed_lesson

router = APIRouter()


@router.get("/lessons/{lesson_id}/quiz", response_model=Optional[LessonQuizRead])
async def get_lesson_quiz(
    lesson: Lesson = Depends(get_managed_lesson),
    session: AsyncSession = Depends(get_session),
):
    return await _build_admin_quiz_read(session=session, lesson_id=lesson.id)


@router.put("/lessons/{lesson_id}/quiz", response_model=LessonQuizRead)
async def upsert_lesson_quiz(
    payload: LessonQuizUpsert,
    lesson: Lesson = Depends(get_managed_lesson),
    session: AsyncSession = Depends(get_session),
):
    if payload.is_enabled and not payload.questions:
        raise HTTPException(status_code=422, detail="Enabled quiz requires at least one question.")

    quiz = await _get_quiz(session=session, lesson_id=lesson.id)
    if quiz is None:
        quiz = LessonQuiz(lesson_id=lesson.id)

    quiz.is_enabled = payload.is_enabled
    quiz.is_required = payload.is_required
    quiz.passing_score_percent = payload.passing_score_percent
    quiz.allow_retries = payload.allow_retries
    quiz.updated_at = datetime.utcnow()
    session.add(quiz)
    await session.flush()

    await _replace_questions(session=session, quiz=quiz, payload=payload)
    await session.commit()

    await _invalidate_lesson_course_cache(session=session, lesson=lesson)
    quiz_read = await _build_admin_quiz_read(session=session, lesson_id=lesson.id)
    if quiz_read is None:
        raise HTTPException(status_code=500, detail="Quiz was not saved")
    return quiz_read


async def _get_quiz(*, session: AsyncSession, lesson_id: uuid.UUID) -> LessonQuiz | None:
    result = await session.exec(select(LessonQuiz).where(LessonQuiz.lesson_id == lesson_id))
    return result.first()


async def _replace_questions(
    *,
    session: AsyncSession,
    quiz: LessonQuiz,
    payload: LessonQuizUpsert,
) -> None:
    existing_questions = await _get_questions(session=session, quiz_id=quiz.id)
    for question in existing_questions:
        for option in await _get_options(session=session, question_id=question.id):
            await session.delete(option)
        await session.delete(question)
    await session.flush()

    for question_payload in payload.questions:
        question = QuizQuestion(
            quiz_id=quiz.id,
            text=question_payload.text,
            question_type=question_payload.question_type,
            explanation=question_payload.explanation,
            order_index=question_payload.order_index,
        )
        session.add(question)
        await session.flush()
        for option_payload in question_payload.options:
            session.add(
                QuizOption(
                    question_id=question.id,
                    text=option_payload.text,
                    is_correct=option_payload.is_correct,
                    order_index=option_payload.order_index,
                )
            )


async def _build_admin_quiz_read(
    *,
    session: AsyncSession,
    lesson_id: uuid.UUID,
) -> LessonQuizRead | None:
    quiz = await _get_quiz(session=session, lesson_id=lesson_id)
    if not quiz:
        return None

    questions = await _get_questions(session=session, quiz_id=quiz.id)
    return LessonQuizRead(
        id=quiz.id,
        lesson_id=quiz.lesson_id,
        is_enabled=quiz.is_enabled,
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
                "options": await _get_options(session=session, question_id=question.id),
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


async def _invalidate_lesson_course_cache(
    *,
    session: AsyncSession,
    lesson: Lesson,
) -> None:
    module = await session.get(Module, lesson.module_id)
    if not module:
        return
    course = await session.get(Course, module.course_id)
    if course:
        await invalidate_course_write_caches(course_id=course.id, tenant_id=course.tenant_id)
