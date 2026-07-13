import uuid

from sqlmodel.ext.asyncio.session import AsyncSession

from ...schemas.lesson_generation import GeneratedLessonQuizPayload
from ...schemas.quizzes import LessonQuizUpsert, QuizOptionPayload, QuizQuestionPayload
from .quiz_writer import (
    get_lesson_quiz,
    get_question_options,
    get_quiz_questions,
    upsert_lesson_quiz_payload,
)


async def persist_generated_lesson_quiz(
    *,
    session: AsyncSession,
    lesson_id: uuid.UUID,
    quiz: GeneratedLessonQuizPayload | None,
    previous_quiz: GeneratedLessonQuizPayload | None = None,
) -> bool:
    if quiz is None:
        return False

    existing = await get_lesson_quiz(session=session, lesson_id=lesson_id)
    if existing is not None and previous_quiz is None:
        return False
    if existing is not None and previous_quiz is not None:
        existing_payload = await _existing_quiz_payload(session=session, lesson_id=lesson_id)
        if existing_payload is not None and _quiz_signature(existing_payload) != _quiz_signature(previous_quiz):
            return False

    await upsert_lesson_quiz_payload(
        session=session,
        lesson_id=lesson_id,
        payload=generated_quiz_to_upsert(quiz),
    )
    return True


def generated_quiz_to_upsert(quiz: GeneratedLessonQuizPayload) -> LessonQuizUpsert:
    return LessonQuizUpsert(
        is_enabled=quiz.is_enabled,
        is_required=quiz.is_required,
        passing_score_percent=quiz.passing_score_percent,
        allow_retries=quiz.allow_retries,
        questions=[
            QuizQuestionPayload(
                text=question.text,
                question_type=question.question_type,
                explanation=question.explanation,
                order_index=index,
                options=[
                    QuizOptionPayload(
                        text=option.text,
                        is_correct=option.is_correct,
                        order_index=option_index,
                    )
                    for option_index, option in enumerate(question.options)
                ],
            )
            for index, question in enumerate(quiz.questions)
        ],
    )


async def _existing_quiz_payload(
    *,
    session: AsyncSession,
    lesson_id: uuid.UUID,
) -> GeneratedLessonQuizPayload | None:
    quiz = await get_lesson_quiz(session=session, lesson_id=lesson_id)
    if quiz is None:
        return None
    questions = await get_quiz_questions(session=session, quiz_id=quiz.id)
    return GeneratedLessonQuizPayload(
        is_enabled=quiz.is_enabled,
        is_required=quiz.is_required,
        passing_score_percent=quiz.passing_score_percent,
        allow_retries=quiz.allow_retries,
        questions=[
            {
                "text": question.text,
                "question_type": question.question_type,
                "explanation": question.explanation or "",
                "order_index": index,
                "options": [
                    {
                        "text": option.text,
                        "is_correct": option.is_correct,
                        "order_index": option_index,
                    }
                    for option_index, option in enumerate(
                        await get_question_options(session=session, question_id=question.id)
                    )
                ],
            }
            for index, question in enumerate(questions)
        ],
    )


def _quiz_signature(quiz: GeneratedLessonQuizPayload) -> dict:
    return {
        "is_enabled": quiz.is_enabled,
        "is_required": quiz.is_required,
        "passing_score_percent": quiz.passing_score_percent,
        "allow_retries": quiz.allow_retries,
        "questions": [
            {
                "text": question.text.strip(),
                "question_type": question.question_type.value,
                "explanation": question.explanation.strip(),
                "options": [
                    {
                        "text": option.text.strip(),
                        "is_correct": option.is_correct,
                    }
                    for option in question.options
                ],
            }
            for question in quiz.questions
        ],
    }
