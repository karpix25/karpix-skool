from ...models_quizzes import QuizQuestionType
from ...schemas.lesson_generation import GeneratedLessonQuizPayload
from .parser import LessonGenerationParseError


MIN_GENERATED_QUIZ_QUESTIONS = 3
MAX_GENERATED_QUIZ_QUESTIONS = 5
PRACTICAL_QUESTION_MARKERS = (
    "что нужно сделать",
    "какой шаг",
    "как примен",
    "выберите действ",
    "выберите шаг",
    "что вы сделаете",
    "как настро",
    "как собрать",
    "как сформулир",
    "как применить",
    "какой вариант поможет",
    "какой вариант",
    "практическ",
    "артефакт",
    "первым",
    "в первую очередь",
)


def validate_generated_quiz_quality(
    *,
    lesson_title: str,
    quiz: GeneratedLessonQuizPayload | None,
) -> None:
    if quiz is None:
        raise LessonGenerationParseError(f'Lesson "{lesson_title}" needs a generated quiz')
    if not quiz.is_enabled:
        raise LessonGenerationParseError(f'Lesson "{lesson_title}" quiz must be enabled')
    if not quiz.is_required:
        raise LessonGenerationParseError(f'Lesson "{lesson_title}" quiz must be required')
    if not (MIN_GENERATED_QUIZ_QUESTIONS <= len(quiz.questions) <= MAX_GENERATED_QUIZ_QUESTIONS):
        raise LessonGenerationParseError(
            f'Lesson "{lesson_title}" quiz needs {MIN_GENERATED_QUIZ_QUESTIONS}-{MAX_GENERATED_QUIZ_QUESTIONS} questions'
        )

    has_practical_question = False
    for index, question in enumerate(quiz.questions, start=1):
        _validate_question(lesson_title=lesson_title, index=index, question=question)
        question_text = question.text.casefold()
        if any(marker in question_text for marker in PRACTICAL_QUESTION_MARKERS):
            has_practical_question = True

    if not has_practical_question:
        raise LessonGenerationParseError(
            f'Lesson "{lesson_title}" quiz needs at least one practical application question'
        )


def _validate_question(*, lesson_title: str, index: int, question) -> None:
    if len(question.explanation.strip()) < 12:
        raise LessonGenerationParseError(
            f'Lesson "{lesson_title}" quiz question {index} needs an explanation'
        )
    if question.question_type == QuizQuestionType.single_choice:
        _validate_choice_count(lesson_title, index, question.options, minimum=3, maximum=4)
        correct_count = sum(1 for option in question.options if option.is_correct)
        if correct_count != 1:
            raise LessonGenerationParseError(
                f'Lesson "{lesson_title}" single-choice quiz question {index} needs exactly one correct option'
            )
    elif question.question_type == QuizQuestionType.multiple_choice:
        _validate_choice_count(lesson_title, index, question.options, minimum=3, maximum=5)
        if not any(option.is_correct for option in question.options):
            raise LessonGenerationParseError(
                f'Lesson "{lesson_title}" multiple-choice quiz question {index} needs at least one correct option'
            )
    elif not any(option.is_correct and option.text.strip() for option in question.options):
        raise LessonGenerationParseError(
            f'Lesson "{lesson_title}" short-text quiz question {index} needs a correct accepted answer'
        )


def _validate_choice_count(lesson_title: str, index: int, options, *, minimum: int, maximum: int) -> None:
    if not (minimum <= len(options) <= maximum):
        raise LessonGenerationParseError(
            f'Lesson "{lesson_title}" quiz question {index} needs {minimum}-{maximum} options'
        )
