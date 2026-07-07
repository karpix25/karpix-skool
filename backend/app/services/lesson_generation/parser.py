import json
from typing import Any

from pydantic import ValidationError

from ...schemas.lesson_generation import GeneratedCourseStructurePayload, GeneratedLessonsPayload


class LessonGenerationParseError(ValueError):
    pass


def parse_generated_lessons(raw_answer: str, *, max_lessons: int) -> GeneratedLessonsPayload:
    payload = _loads_json_object(raw_answer)
    try:
        generated = GeneratedLessonsPayload.model_validate(payload)
    except ValidationError as exc:
        raise LessonGenerationParseError(str(exc)) from exc

    return GeneratedLessonsPayload(lessons=generated.lessons[:max_lessons])


def parse_generated_course_structure(
    raw_answer: str,
    *,
    max_modules: int,
    max_lessons_per_module: int,
) -> GeneratedCourseStructurePayload:
    payload = _loads_json_object(raw_answer)
    try:
        generated = GeneratedCourseStructurePayload.model_validate(payload)
    except ValidationError as exc:
        raise LessonGenerationParseError(str(exc)) from exc

    modules = []
    for module in generated.modules[:max_modules]:
        lessons = module.lessons[:max_lessons_per_module]
        if lessons:
            modules.append(module.model_copy(update={"lessons": lessons}))
    return GeneratedCourseStructurePayload(modules=modules)


def _loads_json_object(raw_answer: str) -> dict[str, Any]:
    clean_answer = raw_answer.strip()
    if clean_answer.startswith("```"):
        clean_answer = clean_answer.replace("```json", "").replace("```", "").strip()

    first = clean_answer.find("{")
    last = clean_answer.rfind("}")
    if first == -1 or last == -1 or last <= first:
        raise LessonGenerationParseError("NotebookLM response did not contain a JSON object")

    try:
        loaded = json.loads(clean_answer[first : last + 1])
    except json.JSONDecodeError as exc:
        raise LessonGenerationParseError(f"NotebookLM returned invalid JSON: {exc}") from exc

    if not isinstance(loaded, dict):
        raise LessonGenerationParseError("NotebookLM JSON response must be an object")
    return loaded
