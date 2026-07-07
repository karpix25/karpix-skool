import json
from typing import Any

from pydantic import ValidationError

from ...schemas.lesson_generation import GeneratedCourseStructurePayload, GeneratedLessonsPayload


class LessonGenerationParseError(ValueError):
    pass


class NotebookLMUnanswerableError(LessonGenerationParseError):
    pass


UNANSWERABLE_MARKERS = (
    "я пока не могу вам ответить",
    "i can't answer",
    "i cannot answer",
    "i don't have enough information",
    "not enough information",
)

UNANSWERABLE_MESSAGE = (
    "NotebookLM не смог ответить по этому notebook. Проверьте, что в notebook добавлены "
    "источники и они доступны, затем запустите генерацию снова."
)


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

    if _is_unanswerable_response(clean_answer):
        raise NotebookLMUnanswerableError(UNANSWERABLE_MESSAGE)

    first = clean_answer.find("{")
    last = clean_answer.rfind("}")
    if first == -1 or last == -1 or last <= first:
        raise LessonGenerationParseError("NotebookLM response did not contain a JSON object")

    loaded = _loads_notebooklm_json(clean_answer[first : last + 1])

    if not isinstance(loaded, dict):
        raise LessonGenerationParseError("NotebookLM JSON response must be an object")
    return loaded


def _is_unanswerable_response(raw_answer: str) -> bool:
    normalized = " ".join(raw_answer.casefold().split())
    return any(marker in normalized for marker in UNANSWERABLE_MARKERS)


def _loads_notebooklm_json(raw_json: str) -> Any:
    try:
        return json.loads(raw_json)
    except json.JSONDecodeError as strict_exc:
        try:
            return json.loads(raw_json, strict=False)
        except json.JSONDecodeError:
            raise LessonGenerationParseError(f"NotebookLM returned invalid JSON: {strict_exc}") from strict_exc
