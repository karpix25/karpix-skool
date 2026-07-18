from ...schemas.lesson_generation import GeneratedLessonPayload
from .generated_quiz_quality import PRACTICAL_QUESTION_MARKERS


def ensure_practical_quiz_question(lesson: GeneratedLessonPayload) -> tuple[GeneratedLessonPayload, bool]:
    quiz = lesson.quiz
    if quiz is None or not quiz.questions:
        return lesson, False
    if any(_looks_practical(question.text) for question in quiz.questions):
        return lesson, False

    questions = list(quiz.questions)
    first_question = questions[0]
    repaired_question = first_question.model_copy(
        update={
            "text": (
                "Что нужно сделать ученику, чтобы применить этот урок: "
                f"{first_question.text}"
            )
        }
    )
    questions[0] = repaired_question
    return lesson.model_copy(update={"quiz": quiz.model_copy(update={"questions": questions})}), True


def _looks_practical(text: str) -> bool:
    normalized = text.casefold()
    return any(marker in normalized for marker in PRACTICAL_QUESTION_MARKERS)
