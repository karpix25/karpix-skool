from collections.abc import Sequence
import uuid

from fastapi import BackgroundTasks, HTTPException
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from ...models import Lesson, User
from ...models_quizzes import LessonQuiz, QuizAttempt, QuizOption, QuizQuestion
from ...schemas.quizzes import QuizAnswerSubmission, QuizAttemptResponse
from ...services.webapp.lesson_completion import complete_webapp_lesson
from .quiz_scoring import ScoringOption, ScoringQuestion, SubmittedAnswer, score_quiz


async def get_latest_attempt(
    *,
    session: AsyncSession,
    quiz_id: uuid.UUID,
    user_id: uuid.UUID,
) -> QuizAttempt | None:
    result = await session.exec(
        select(QuizAttempt)
        .where(
            QuizAttempt.quiz_id == quiz_id,
            QuizAttempt.user_id == user_id,
        )
        .order_by(QuizAttempt.created_at.desc())
    )
    return result.first()


async def get_latest_passed_attempt(
    *,
    session: AsyncSession,
    lesson_id: uuid.UUID,
    user_id: uuid.UUID,
) -> QuizAttempt | None:
    result = await session.exec(
        select(QuizAttempt)
        .where(
            QuizAttempt.lesson_id == lesson_id,
            QuizAttempt.user_id == user_id,
            QuizAttempt.passed == True,
        )
        .order_by(QuizAttempt.created_at.desc())
    )
    return result.first()


async def submit_quiz_attempt(
    *,
    session: AsyncSession,
    lesson: Lesson,
    quiz: LessonQuiz,
    questions: Sequence[QuizQuestion],
    options_by_question: dict[uuid.UUID, list[QuizOption]],
    answers: list[QuizAnswerSubmission],
    background_tasks: BackgroundTasks,
    current_user: User,
) -> QuizAttemptResponse:
    latest_attempt = await get_latest_attempt(
        session=session,
        quiz_id=quiz.id,
        user_id=current_user.id,
    )
    if latest_attempt and not quiz.allow_retries:
        raise HTTPException(status_code=409, detail="Quiz retries are disabled.")

    score = score_quiz(
        questions=[
            ScoringQuestion(
                id=question.id,
                question_type=question.question_type,
                explanation=question.explanation,
                options=[
                    ScoringOption(
                        id=option.id,
                        text=option.text,
                        is_correct=option.is_correct,
                    )
                    for option in options_by_question.get(question.id, [])
                ],
            )
            for question in questions
        ],
        answers=[
            SubmittedAnswer(
                question_id=answer.question_id,
                selected_option_ids=answer.selected_option_ids,
                text_answer=answer.text_answer,
            )
            for answer in answers
        ],
    )
    passed = score.score_percent >= quiz.passing_score_percent
    question_results = [
        {
            "question_id": str(result.question_id),
            "question_type": result.question_type.value,
            "is_correct": result.is_correct,
            "explanation": result.explanation,
            "selected_option_ids": [str(option_id) for option_id in result.selected_option_ids],
            "submitted_text": result.submitted_text,
            "correct_option_ids": [str(option_id) for option_id in result.correct_option_ids],
        }
        for result in score.question_results
    ]
    attempt = QuizAttempt(
        quiz_id=quiz.id,
        lesson_id=lesson.id,
        user_id=current_user.id,
        score_percent=score.score_percent,
        passed=passed,
        answers=[
            {
                "question_id": str(answer.question_id),
                "selected_option_ids": [str(option_id) for option_id in answer.selected_option_ids],
                "text_answer": answer.text_answer,
            }
            for answer in answers
        ],
        question_results=question_results,
    )
    session.add(attempt)
    await session.commit()
    await session.refresh(attempt)

    completion_result = None
    if passed:
        completion_result = await complete_webapp_lesson(
            lesson_id=lesson.id,
            background_tasks=background_tasks,
            current_user=current_user,
            session=session,
            skip_required_quiz_check=True,
        )

    return QuizAttemptResponse(
        attempt_id=attempt.id,
        score_percent=attempt.score_percent,
        passed=attempt.passed,
        correct_count=sum(1 for result in score.question_results if result.is_correct),
        total_questions=len(score.question_results),
        question_results=question_results,
        completion_result=completion_result,
    )
