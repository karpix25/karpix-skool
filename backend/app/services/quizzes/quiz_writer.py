from datetime import datetime
import uuid

from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from ...models_quizzes import LessonQuiz, QuizOption, QuizQuestion
from ...schemas.quizzes import LessonQuizUpsert


async def upsert_lesson_quiz_payload(
    *,
    session: AsyncSession,
    lesson_id: uuid.UUID,
    payload: LessonQuizUpsert,
) -> LessonQuiz:
    quiz = await get_lesson_quiz(session=session, lesson_id=lesson_id)
    if quiz is None:
        quiz = LessonQuiz(lesson_id=lesson_id)

    quiz.is_enabled = payload.is_enabled
    quiz.is_required = payload.is_required
    quiz.passing_score_percent = payload.passing_score_percent
    quiz.allow_retries = payload.allow_retries
    quiz.updated_at = datetime.utcnow()
    session.add(quiz)
    await session.flush()

    await replace_quiz_questions(session=session, quiz=quiz, payload=payload)
    return quiz


async def get_lesson_quiz(
    *,
    session: AsyncSession,
    lesson_id: uuid.UUID,
) -> LessonQuiz | None:
    result = await session.exec(select(LessonQuiz).where(LessonQuiz.lesson_id == lesson_id))
    return result.first()


async def replace_quiz_questions(
    *,
    session: AsyncSession,
    quiz: LessonQuiz,
    payload: LessonQuizUpsert,
) -> None:
    existing_questions = await get_quiz_questions(session=session, quiz_id=quiz.id)
    for question in existing_questions:
        for option in await get_question_options(session=session, question_id=question.id):
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


async def get_quiz_questions(
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


async def get_question_options(
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
