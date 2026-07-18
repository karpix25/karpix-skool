import uuid

import pytest
from pydantic import ValidationError

from app.models import Course, Lesson, Module
from app.models_quizzes import LessonQuiz, QuizOption, QuizQuestion, QuizQuestionType
from app.schemas.lesson_generation import (
    GeneratedLessonPayload,
    GeneratedLessonQuizPayload,
)
from app.services.lesson_generation.course_structure_stage_prompts import build_packaged_lesson_prompt
from app.services.lesson_generation.course_structure_stage_payloads import (
    CourseBlueprintLessonPayload,
    CourseBlueprintModulePayload,
    LessonSourcePackPayload,
    ProductCourseStrategyPayload,
    parse_packaged_lesson,
)
from app.services.lesson_generation.generated_quiz_quality import validate_generated_quiz_quality
from app.services.lesson_generation.generated_quiz_repairs import ensure_practical_quiz_question
from app.services.quizzes.generated_quiz_writer import persist_generated_lesson_quiz


class FakeResult:
    def __init__(self, *, first_value=None, all_value=None):
        self._first_value = first_value
        self._all_value = all_value if all_value is not None else []

    def first(self):
        return self._first_value

    def all(self):
        return self._all_value


class FakeSession:
    def __init__(self, objects=None, exec_results=None):
        self._objects = {(type(item), item.id): item for item in objects or []}
        self._exec_results = list(exec_results or [])
        self.added = []
        self.deleted = []
        self.flushed = False

    async def exec(self, _statement):
        if not self._exec_results:
            return FakeResult()
        return self._exec_results.pop(0)

    def add(self, item):
        self.added.append(item)
        if hasattr(item, "id"):
            self._objects[(type(item), item.id)] = item

    async def delete(self, item):
        self.deleted.append(item)

    async def flush(self):
        self.flushed = True


def generated_quiz() -> GeneratedLessonQuizPayload:
    return GeneratedLessonQuizPayload.model_validate(
        {
            "questions": [
                {
                    "text": "Какой шаг нужно сделать первым, чтобы применить урок?",
                    "question_type": "single_choice",
                    "explanation": "Сначала выбирают действие из урока, иначе дальше нечего проверять.",
                    "options": [
                        {"text": "Выбрать первое действие", "is_correct": True},
                        {"text": "Сразу масштабировать", "is_correct": False},
                        {"text": "Пропустить проверку", "is_correct": False},
                    ],
                },
                {
                    "text": "Какие элементы относятся к практическому результату?",
                    "question_type": "multiple_choice",
                    "explanation": "Практический результат состоит из артефактов, которые ученик создает руками.",
                    "options": [
                        {"text": "Чеклист", "is_correct": True},
                        {"text": "План", "is_correct": True},
                        {"text": "Мотивационная фраза", "is_correct": False},
                    ],
                },
                {
                    "text": "Как называется итоговый артефакт урока?",
                    "question_type": "short_text",
                    "explanation": "Ответ сверяется с названием артефакта из урока.",
                    "options": [
                        {"text": "чеклист первого шага", "is_correct": True},
                    ],
                },
            ]
        }
    )


def test_generated_quiz_schema_rejects_invalid_correct_flags():
    with pytest.raises(ValidationError):
        GeneratedLessonQuizPayload.model_validate(
            {
                "questions": [
                    {
                        "text": "Вопрос 1",
                        "question_type": "single_choice",
                        "explanation": "Объяснение правильного ответа.",
                        "options": [
                            {"text": "А", "is_correct": True},
                            {"text": "Б", "is_correct": True},
                        ],
                    },
                    {
                        "text": "Вопрос 2",
                        "question_type": "single_choice",
                        "explanation": "Объяснение правильного ответа.",
                        "options": [
                            {"text": "А", "is_correct": True},
                            {"text": "Б", "is_correct": False},
                        ],
                    },
                    {
                        "text": "Вопрос 3",
                        "question_type": "short_text",
                        "explanation": "Объяснение правильного ответа.",
                        "options": [
                            {"text": "ответ", "is_correct": True},
                        ],
                    },
                ]
            }
        )


def test_generated_quiz_quality_requires_practical_question():
    quiz = generated_quiz().model_copy(
        update={
            "questions": [
                question.model_copy(update={"text": f"Что проверяет вопрос {index}?"})
                for index, question in enumerate(generated_quiz().questions, start=1)
            ]
        }
    )

    with pytest.raises(Exception, match="practical application"):
        validate_generated_quiz_quality(lesson_title="Первый шаг", quiz=quiz)


def test_practical_quiz_repair_rewords_first_question_when_markers_are_missing():
    lesson = GeneratedLessonPayload(
        title="Первый шаг",
        html="<h2>Чеклист первого шага</h2><p>Текст</p>",
        quiz=generated_quiz().model_copy(
            update={
                "questions": [
                    question.model_copy(update={"text": f"Что проверяет вопрос {index}?"})
                    for index, question in enumerate(generated_quiz().questions, start=1)
                ]
            }
        ),
    )

    repaired, changed = ensure_practical_quiz_question(lesson)

    assert changed is True
    assert repaired.quiz is not None
    assert repaired.quiz.questions[0].text.startswith("Что нужно сделать ученику")
    validate_generated_quiz_quality(lesson_title=repaired.title, quiz=repaired.quiz)


def test_packaged_lesson_prompt_requires_quiz_and_plain_practical_language():
    lesson_blueprint = CourseBlueprintLessonPayload(
        title="Первый шаг",
        learning_outcome="выбрать действие",
        student_deliverable="чеклист первого шага",
        source_focus="первое действие",
        course_path_bridge="дальше чеклист станет основой",
        media_placeholders=["SCHEME: чеклист"],
    )
    prompt = build_packaged_lesson_prompt(
        course_title="Практичный курс",
        module=CourseBlueprintModulePayload(
            title="Старт",
            module_outcome="ученик делает первый артефакт",
            final_project_piece="чеклист первого шага",
            lessons=[lesson_blueprint],
        ),
        lesson=lesson_blueprint,
        source_pack=LessonSourcePackPayload(
            facts=["факт из источника"],
            process_steps=["выберите действие"],
            examples=["пример"],
            constraints=["не обещать лишнего"],
            source_gaps=[],
            source_basis_summary="источник поддерживает урок",
        ),
        product_strategy=ProductCourseStrategyPayload(
            product_promise="сделать первый артефакт",
            target_student="новичок",
            start_state="не знает первый шаг",
            end_state="имеет чеклист",
            final_project="план",
            course_angle="понятный практический курс",
            proof_boundary="только источник",
            module_progression_logic=["база", "практика"],
        ),
    )

    assert "Russian 10th grade student" in prompt
    assert "Build the course from simple to complex" in prompt
    assert "Every generated lesson must include a short quiz" in prompt
    assert '"quiz"' in prompt


def test_parse_packaged_lesson_keeps_generated_quiz():
    payload = GeneratedLessonPayload(
        title="Первый шаг",
        html="<h2>Чеклист первого шага</h2><p>Текст</p>",
        media_plan=["SCHEME: чеклист"],
        quiz=generated_quiz(),
    )

    parsed = parse_packaged_lesson(payload.model_dump_json())

    assert parsed.quiz is not None
    assert parsed.quiz.is_enabled is True
    assert parsed.quiz.is_required is True
    assert parsed.quiz.questions[0].question_type == QuizQuestionType.single_choice


def test_parse_packaged_lesson_normalizes_model_quiz_option_shortcuts():
    parsed = parse_packaged_lesson(
        """
        {
          "title": "Первый шаг",
          "html": "<h2>Чеклист первого шага</h2><p>Текст</p>",
          "quiz": {
            "questions": [
              {
                "text": "Какой шаг нужно сделать первым?",
                "question_type": "single_choice",
                "explanation": "Сначала нужен первый практический шаг.",
                "options": ["Выбрать действие", "Сразу масштабировать", "Пропустить проверку"]
              },
              {
                "text": "Какие элементы входят в артефакт?",
                "question_type": "multiple_choice",
                "explanation": "Артефакт собирается из практических элементов.",
                "options": [
                  {"label": "Чеклист", "correct": true},
                  {"label": "План", "correct": true},
                  {"label": "Мотивационная фраза", "correct": false}
                ]
              },
              {
                "text": "Как называется артефакт?",
                "question_type": "short_text",
                "explanation": "Ответ сверяется с названием артефакта.",
                "options": ["чеклист первого шага"]
              }
            ]
          }
        }
        """
    )

    assert parsed.quiz is not None
    assert parsed.quiz.questions[0].options[0].is_correct is True
    assert parsed.quiz.questions[1].options[0].text == "Чеклист"
    assert parsed.quiz.questions[2].options[0].is_correct is True


@pytest.mark.asyncio
async def test_persist_generated_quiz_creates_regular_lesson_quiz_payload():
    lesson_id = uuid.uuid4()
    session = FakeSession()

    saved = await persist_generated_lesson_quiz(
        session=session,
        lesson_id=lesson_id,
        quiz=generated_quiz(),
    )

    quiz = next(item for item in session.added if isinstance(item, LessonQuiz))
    questions = [item for item in session.added if isinstance(item, QuizQuestion)]
    options = [item for item in session.added if isinstance(item, QuizOption)]
    assert saved is True
    assert quiz.lesson_id == lesson_id
    assert quiz.is_enabled is True
    assert quiz.is_required is True
    assert quiz.passing_score_percent == 70
    assert len(questions) == 3
    assert len(options) == 7


@pytest.mark.asyncio
async def test_persist_generated_quiz_preserves_manual_existing_quiz_without_previous_payload():
    lesson_id = uuid.uuid4()
    existing = LessonQuiz(lesson_id=lesson_id)
    session = FakeSession(objects=[existing], exec_results=[FakeResult(first_value=existing)])

    saved = await persist_generated_lesson_quiz(
        session=session,
        lesson_id=lesson_id,
        quiz=generated_quiz(),
    )

    assert saved is False
    assert not [item for item in session.added if isinstance(item, QuizQuestion)]


def test_generated_quiz_payload_fits_existing_course_models():
    course = Course(id=uuid.uuid4(), tenant_id=uuid.uuid4(), title="Курс")
    module = Module(id=uuid.uuid4(), course_id=course.id, title="Модуль")
    lesson = Lesson(id=uuid.uuid4(), module_id=module.id, title="Урок")

    assert lesson.module_id == module.id
    assert module.course_id == course.id
    assert generated_quiz().is_required is True
