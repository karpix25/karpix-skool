import uuid

from fastapi import HTTPException
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from ...models_quizzes import LessonQuiz, QuizAttempt


async def ensure_required_quiz_passed(
    *,
    session: AsyncSession,
    lesson_id: uuid.UUID,
    user_id: uuid.UUID,
) -> None:
    result = await session.exec(
        select(LessonQuiz).where(
            LessonQuiz.lesson_id == lesson_id,
            LessonQuiz.is_enabled == True,
            LessonQuiz.is_required == True,
        )
    )
    quiz = result.first()
    if not quiz:
        return

    passed_result = await session.exec(
        select(QuizAttempt)
        .where(
            QuizAttempt.lesson_id == lesson_id,
            QuizAttempt.user_id == user_id,
            QuizAttempt.passed == True,
        )
        .order_by(QuizAttempt.created_at.desc())
    )
    if passed_result.first():
        return

    raise HTTPException(
        status_code=403,
        detail="Pass the lesson quiz before completing this lesson.",
    )
