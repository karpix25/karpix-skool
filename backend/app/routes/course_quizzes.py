from typing import Optional
import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel.ext.asyncio.session import AsyncSession

from ..db import get_session
from ..models import Course, Lesson, Module
from ..schemas.quizzes import LessonQuizRead, LessonQuizUpsert
from ..services.cache_invalidation import invalidate_course_write_caches
from ..services.quizzes.quiz_writer import (
    get_lesson_quiz as get_lesson_quiz_model,
    get_question_options,
    get_quiz_questions,
    upsert_lesson_quiz_payload,
)
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

    await upsert_lesson_quiz_payload(session=session, lesson_id=lesson.id, payload=payload)
    await session.commit()

    await _invalidate_lesson_course_cache(session=session, lesson=lesson)
    quiz_read = await _build_admin_quiz_read(session=session, lesson_id=lesson.id)
    if quiz_read is None:
        raise HTTPException(status_code=500, detail="Quiz was not saved")
    return quiz_read


async def _build_admin_quiz_read(
    *,
    session: AsyncSession,
    lesson_id: uuid.UUID,
) -> LessonQuizRead | None:
    quiz = await get_lesson_quiz_model(session=session, lesson_id=lesson_id)
    if not quiz:
        return None

    questions = await get_quiz_questions(session=session, quiz_id=quiz.id)
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
                "options": await get_question_options(session=session, question_id=question.id),
            }
            for question in questions
        ],
    )


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
