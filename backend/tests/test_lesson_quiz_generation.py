import uuid

import pytest
from fastapi import HTTPException

from app.models import Lesson
from app.models_quizzes import LessonQuiz, QuizQuestionType
from app.routes import course_quizzes
from app.schemas.quizzes import LessonQuizGenerateRequest, LessonQuizRead, LessonQuizUpsert
from app.services.quizzes.lesson_quiz_generator import (
    LessonQuizGenerationError,
    LessonQuizGenerator,
    parse_lesson_quiz_response,
)


class FakeSession:
    def __init__(self) -> None:
        self.committed = False

    async def commit(self) -> None:
        self.committed = True


class FakeTextGenerator:
    def __init__(self, response: str) -> None:
        self.response = response
        self.prompts: list[str] = []

    async def generate_text(self, prompt: str) -> str:
        self.prompts.append(prompt)
        return self.response


def lesson() -> Lesson:
    return Lesson(
        id=uuid.uuid4(),
        module_id=uuid.uuid4(),
        title="Как собрать план запуска",
        content="<h2>План</h2><p>Выберите цель, шаги и критерий проверки.</p>",
    )


def quiz_payload() -> LessonQuizUpsert:
    return LessonQuizUpsert.model_validate(
        {
            "is_enabled": True,
            "is_required": True,
            "passing_score_percent": 70,
            "allow_retries": True,
            "questions": [
                {
                    "text": "Что нужно выбрать первым?",
                    "question_type": "single_choice",
                    "explanation": "Без цели нельзя собрать полезный план.",
                    "order_index": 0,
                    "options": [
                        {"text": "Цель", "is_correct": True, "order_index": 0},
                        {"text": "Цвет обложки", "is_correct": False, "order_index": 1},
                    ],
                },
                {
                    "text": "Какие части входят в план запуска?",
                    "question_type": "multiple_choice",
                    "explanation": "План должен показывать действия и проверку результата.",
                    "order_index": 1,
                    "options": [
                        {"text": "Шаги", "is_correct": True, "order_index": 0},
                        {"text": "Критерий проверки", "is_correct": True, "order_index": 1},
                        {"text": "Случайная цитата", "is_correct": False, "order_index": 2},
                    ],
                },
                {
                    "text": "Какой элемент показывает, что запуск можно проверить?",
                    "question_type": "short_text",
                    "explanation": "Критерий проверки фиксирует ожидаемый результат.",
                    "order_index": 2,
                    "options": [
                        {"text": "критерий проверки", "is_correct": True, "order_index": 0},
                    ],
                },
            ],
        }
    )


@pytest.mark.asyncio
async def test_generate_lesson_quiz_saves_generated_payload_and_returns_read_model(monkeypatch):
    saved_payloads: list[LessonQuizUpsert] = []
    target_lesson = lesson()
    session = FakeSession()
    payload = quiz_payload()

    class FakeGenerator:
        async def generate_quiz(self, **kwargs):
            assert kwargs == {
                "lesson_title": target_lesson.title,
                "lesson_content": target_lesson.content,
            }
            return payload

    async def fake_get_lesson_quiz_model(**_kwargs):
        return None

    async def fake_upsert_lesson_quiz_payload(**kwargs):
        saved_payloads.append(kwargs["payload"])

    async def fake_invalidate_lesson_course_cache(**_kwargs):
        return None

    async def fake_build_admin_quiz_read(**_kwargs):
        return LessonQuizRead(
            id=uuid.uuid4(),
            lesson_id=target_lesson.id,
            is_enabled=True,
            is_required=True,
            passing_score_percent=70,
            allow_retries=True,
            questions=[],
        )

    monkeypatch.setattr(course_quizzes, "LessonQuizGenerator", FakeGenerator)
    monkeypatch.setattr(course_quizzes, "get_lesson_quiz_model", fake_get_lesson_quiz_model)
    monkeypatch.setattr(course_quizzes, "upsert_lesson_quiz_payload", fake_upsert_lesson_quiz_payload)
    monkeypatch.setattr(course_quizzes, "_invalidate_lesson_course_cache", fake_invalidate_lesson_course_cache)
    monkeypatch.setattr(course_quizzes, "_build_admin_quiz_read", fake_build_admin_quiz_read)

    response = await course_quizzes.generate_lesson_quiz(
        LessonQuizGenerateRequest(),
        target_lesson,
        session,
    )

    assert session.committed is True
    assert saved_payloads == [payload]
    assert response.lesson_id == target_lesson.id


@pytest.mark.asyncio
async def test_generate_lesson_quiz_rejects_existing_quiz_without_replace(monkeypatch):
    generator_called = False
    target_lesson = lesson()

    class FakeGenerator:
        async def generate_quiz(self, **_kwargs):
            nonlocal generator_called
            generator_called = True
            return quiz_payload()

    async def fake_get_lesson_quiz_model(**_kwargs):
        return LessonQuiz(id=uuid.uuid4(), lesson_id=target_lesson.id)

    monkeypatch.setattr(course_quizzes, "LessonQuizGenerator", FakeGenerator)
    monkeypatch.setattr(course_quizzes, "get_lesson_quiz_model", fake_get_lesson_quiz_model)

    with pytest.raises(HTTPException) as exc_info:
        await course_quizzes.generate_lesson_quiz(
            LessonQuizGenerateRequest(),
            target_lesson,
            FakeSession(),
        )

    assert exc_info.value.status_code == 409
    assert generator_called is False


@pytest.mark.asyncio
async def test_lesson_quiz_generator_uses_lesson_text_and_validates_upsert_shape():
    raw_response = quiz_payload().model_dump_json()
    text_generator = FakeTextGenerator(raw_response)

    payload = await LessonQuizGenerator(text_generator=text_generator).generate_quiz(
        lesson_title="Как собрать план запуска",
        lesson_content="<p>Выберите цель и критерий проверки.</p>",
    )

    assert payload.questions[0].question_type == QuizQuestionType.single_choice
    assert "Как собрать план запуска" in text_generator.prompts[0]
    assert "Выберите цель и критерий проверки." in text_generator.prompts[0]
    assert "10 класса" in text_generator.prompts[0]
    assert "3-5 практичных вопросов" in text_generator.prompts[0]
    assert "Без воды" in text_generator.prompts[0]


def test_parse_lesson_quiz_response_requires_three_to_five_questions():
    too_short = quiz_payload().model_copy(update={"questions": quiz_payload().questions[:2]})

    with pytest.raises(LessonQuizGenerationError, match="3 to 5"):
        parse_lesson_quiz_response(too_short.model_dump_json())
