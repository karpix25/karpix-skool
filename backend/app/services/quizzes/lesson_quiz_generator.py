import re
from typing import Any

from pydantic import ValidationError

from ...schemas.quizzes import LessonQuizUpsert
from ..lesson_generation.structure_text_generator import StructureTextGenerator
from ..lesson_generation.tolerant_json import TolerantJsonError, load_tolerant_json


MAX_LESSON_CONTENT_CHARS = 12000


class LessonQuizGenerationError(ValueError):
    pass


class LessonQuizGenerator:
    def __init__(self, *, text_generator: StructureTextGenerator | None = None) -> None:
        self.text_generator = text_generator or StructureTextGenerator(role="writer")

    async def generate_quiz(
        self,
        *,
        lesson_title: str,
        lesson_content: str | None,
    ) -> LessonQuizUpsert:
        prompt = build_lesson_quiz_prompt(
            lesson_title=lesson_title,
            lesson_content=lesson_content,
        )
        raw_response = await self.text_generator.generate_text(prompt)
        return parse_lesson_quiz_response(raw_response)


def build_lesson_quiz_prompt(
    *,
    lesson_title: str,
    lesson_content: str | None,
) -> str:
    clean_content = _compact_text(_strip_html(lesson_content or ""))[:MAX_LESSON_CONTENT_CHARS]
    if not clean_content:
        clean_content = "Материал урока пустой. Составь вопросы только по названию урока и не выдумывай детали."

    return f"""
Ты составляешь короткий проверочный тест к готовому уроку Karpix Skool.

Требования:
- Пиши простым русским языком уровня 10 класса РФ.
- Сделай 3-5 практичных вопросов строго по уроку.
- Без воды, мотивационных лозунгов и абстрактных формулировок.
- Проверяй понимание действий, решений, ошибок и применения материала.
- Используй только типы question_type: "single_choice", "multiple_choice", "short_text".
- Для single_choice нужен ровно один правильный вариант.
- Для multiple_choice нужен минимум один правильный вариант.
- Для short_text укажи минимум один правильный текстовый ответ в options.
- У каждого вопроса должно быть короткое explanation: почему ответ верный.

Верни только JSON без markdown:
{{
  "is_enabled": true,
  "is_required": true,
  "passing_score_percent": 70,
  "allow_retries": true,
  "questions": [
    {{
      "text": "Вопрос",
      "question_type": "single_choice",
      "explanation": "Короткое объяснение.",
      "order_index": 0,
      "options": [
        {{"text": "Вариант", "is_correct": true, "order_index": 0}},
        {{"text": "Вариант", "is_correct": false, "order_index": 1}},
        {{"text": "Вариант", "is_correct": false, "order_index": 2}}
      ]
    }}
  ]
}}

Название урока:
{lesson_title}

Материал урока:
{clean_content}
""".strip()


def parse_lesson_quiz_response(raw_response: str) -> LessonQuizUpsert:
    try:
        parsed = load_tolerant_json(raw_response)
    except TolerantJsonError as exc:
        raise LessonQuizGenerationError(f"Quiz generator returned invalid JSON: {exc}") from exc

    quiz_data = _extract_quiz_data(parsed)
    try:
        payload = LessonQuizUpsert.model_validate(quiz_data)
    except ValidationError as exc:
        raise LessonQuizGenerationError(f"Quiz generator returned invalid quiz shape: {exc}") from exc

    _validate_generated_quiz_contract(payload)
    return payload


def _extract_quiz_data(parsed: Any) -> Any:
    if isinstance(parsed, dict) and "quiz" in parsed:
        return parsed["quiz"]
    return parsed


def _validate_generated_quiz_contract(payload: LessonQuizUpsert) -> None:
    question_count = len(payload.questions)
    if question_count < 3 or question_count > 5:
        raise LessonQuizGenerationError("Quiz generator must return 3 to 5 questions.")
    if payload.is_enabled and not payload.questions:
        raise LessonQuizGenerationError("Enabled quiz requires at least one question.")


def _strip_html(value: str) -> str:
    without_tags = re.sub(r"<[^>]+>", " ", value)
    return (
        without_tags.replace("&nbsp;", " ")
        .replace("&amp;", "&")
        .replace("&lt;", "<")
        .replace("&gt;", ">")
    )


def _compact_text(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip()
