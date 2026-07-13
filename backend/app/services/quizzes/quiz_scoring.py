from dataclasses import dataclass, field
import re
import uuid

from ...models_quizzes import QuizQuestionType


@dataclass(frozen=True)
class ScoringOption:
    id: uuid.UUID
    text: str
    is_correct: bool


@dataclass(frozen=True)
class ScoringQuestion:
    id: uuid.UUID
    question_type: QuizQuestionType
    explanation: str | None = None
    options: list[ScoringOption] = field(default_factory=list)


@dataclass(frozen=True)
class SubmittedAnswer:
    question_id: uuid.UUID
    selected_option_ids: list[uuid.UUID] = field(default_factory=list)
    text_answer: str | None = None


@dataclass(frozen=True)
class QuestionScore:
    question_id: uuid.UUID
    question_type: QuizQuestionType
    is_correct: bool
    explanation: str | None
    selected_option_ids: list[uuid.UUID]
    submitted_text: str | None
    correct_option_ids: list[uuid.UUID]


@dataclass(frozen=True)
class QuizScore:
    score_percent: int
    question_results: list[QuestionScore]


def score_quiz(
    *,
    questions: list[ScoringQuestion],
    answers: list[SubmittedAnswer],
) -> QuizScore:
    answers_by_question = {answer.question_id: answer for answer in answers}
    results = [
        score_question(
            question=question,
            answer=answers_by_question.get(question.id),
        )
        for question in questions
    ]
    if not results:
        return QuizScore(score_percent=0, question_results=[])

    correct_count = sum(1 for result in results if result.is_correct)
    return QuizScore(
        score_percent=round((correct_count / len(results)) * 100),
        question_results=results,
    )


def score_question(
    *,
    question: ScoringQuestion,
    answer: SubmittedAnswer | None,
) -> QuestionScore:
    selected_ids = answer.selected_option_ids if answer else []
    submitted_text = answer.text_answer if answer else None
    correct_ids = [option.id for option in question.options if option.is_correct]

    if question.question_type == QuizQuestionType.single_choice:
        is_correct = _score_single_choice(selected_ids, correct_ids)
    elif question.question_type == QuizQuestionType.multiple_choice:
        is_correct = _score_multiple_choice(selected_ids, correct_ids)
    else:
        is_correct = _score_short_text(question.options, submitted_text)

    return QuestionScore(
        question_id=question.id,
        question_type=question.question_type,
        is_correct=is_correct,
        explanation=question.explanation,
        selected_option_ids=selected_ids,
        submitted_text=submitted_text,
        correct_option_ids=correct_ids,
    )


def normalize_short_text_answer(value: str | None) -> str:
    return re.sub(r"\s+", " ", (value or "").strip()).casefold()


def _score_single_choice(
    selected_option_ids: list[uuid.UUID],
    correct_option_ids: list[uuid.UUID],
) -> bool:
    return len(selected_option_ids) == 1 and selected_option_ids == correct_option_ids


def _score_multiple_choice(
    selected_option_ids: list[uuid.UUID],
    correct_option_ids: list[uuid.UUID],
) -> bool:
    return (
        bool(correct_option_ids)
        and len(selected_option_ids) == len(set(selected_option_ids))
        and set(selected_option_ids) == set(correct_option_ids)
    )


def _score_short_text(
    options: list[ScoringOption],
    submitted_text: str | None,
) -> bool:
    normalized_answer = normalize_short_text_answer(submitted_text)
    if not normalized_answer:
        return False

    accepted_answers = {
        normalize_short_text_answer(option.text)
        for option in options
        if option.is_correct and normalize_short_text_answer(option.text)
    }
    return normalized_answer in accepted_answers
