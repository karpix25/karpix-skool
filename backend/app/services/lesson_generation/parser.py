from typing import Any

from pydantic import ValidationError

from ...schemas.lesson_generation import GeneratedCourseStructurePayload, GeneratedLessonsPayload
from .tolerant_json import TolerantJsonError, load_tolerant_json


class LessonGenerationParseError(ValueError):
    pass


class GenerationUnanswerableError(LessonGenerationParseError):
    pass


UNANSWERABLE_MARKERS = (
    "я пока не могу вам ответить",
    "i can't answer",
    "i cannot answer",
    "i don't have enough information",
    "not enough information",
)

UNANSWERABLE_MESSAGE = (
    "Open Notebook не смог извлечь достаточно информации из источника. Проверьте, что "
    "ссылка доступна и содержит нужный материал, затем запустите генерацию снова."
)


def parse_generated_lessons(raw_answer: str, *, max_lessons: int) -> GeneratedLessonsPayload:
    payload = _loads_json_object(raw_answer, root_key="lessons")
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
    payload = _loads_json_object(raw_answer, root_key="modules")
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


def _loads_json_object(raw_answer: str, *, root_key: str) -> dict[str, Any]:
    clean_answer = raw_answer.strip()

    if _is_unanswerable_response(clean_answer):
        raise GenerationUnanswerableError(UNANSWERABLE_MESSAGE)

    if "{" not in clean_answer and "[" not in clean_answer:
        raise LessonGenerationParseError("Open Notebook response did not contain a JSON object")

    try:
        loaded = load_tolerant_json(clean_answer)
    except TolerantJsonError as exc:
        raise LessonGenerationParseError(f"Open Notebook returned invalid JSON: {exc}") from exc

    normalized = _normalize_generation_payload(loaded, root_key=root_key)
    if not isinstance(normalized, dict):
        raise LessonGenerationParseError("Open Notebook JSON response must be an object")
    return normalized


def _is_unanswerable_response(raw_answer: str) -> bool:
    normalized = " ".join(raw_answer.casefold().split())
    return any(marker in normalized for marker in UNANSWERABLE_MARKERS)


def _normalize_generation_payload(loaded: Any, *, root_key: str) -> Any:
    payload = _unwrap_payload(loaded, root_key=root_key)
    if isinstance(payload, list):
        payload = {root_key: payload}
    if not isinstance(payload, dict):
        return payload

    if root_key == "lessons":
        lessons = payload.get("lessons") or payload.get("items")
        payload["lessons"] = _normalize_lessons(lessons)
        return payload

    modules = payload.get("modules") or payload.get("chapters") or payload.get("sections")
    if isinstance(modules, list):
        payload["modules"] = [_normalize_module(module) for module in modules]
    return payload


def _unwrap_payload(loaded: Any, *, root_key: str, depth: int = 0) -> Any:
    if depth > 4 or not isinstance(loaded, dict):
        return loaded
    if root_key in loaded:
        return loaded

    for key in ("course", "course_structure", "data", "result", "payload", "output"):
        nested = loaded.get(key)
        if isinstance(nested, (dict, list)):
            return _unwrap_payload(nested, root_key=root_key, depth=depth + 1)
    return loaded


def _normalize_module(module: Any) -> Any:
    if not isinstance(module, dict):
        return module
    normalized = dict(module)
    lessons = normalized.get("lessons") or normalized.get("items")
    normalized["lessons"] = _normalize_lessons(lessons)
    return normalized


def _normalize_lessons(lessons: Any) -> list[Any]:
    if not isinstance(lessons, list):
        return []
    return [_normalize_lesson(lesson) for lesson in lessons]


def _normalize_lesson(lesson: Any) -> Any:
    if not isinstance(lesson, dict):
        return lesson
    normalized = dict(lesson)
    if not _has_text(normalized.get("html")):
        for key in ("content", "body", "text", "markdown"):
            value = normalized.get(key)
            if _has_text(value):
                normalized["html"] = value.strip()
                break
    if not normalized.get("icon_emoji") and normalized.get("emoji"):
        normalized["icon_emoji"] = normalized.get("emoji")
    if "media_plan" not in normalized:
        normalized["media_plan"] = _normalize_media_plan(
            normalized.get("media") or normalized.get("media_items") or normalized.get("visuals")
        )
    return normalized


def _normalize_media_plan(value: Any) -> list[str]:
    if value is None:
        return []
    if isinstance(value, str):
        return [value.strip()] if value.strip() else []
    if not isinstance(value, list):
        return []

    media_items = []
    for item in value:
        if isinstance(item, str) and item.strip():
            media_items.append(item.strip())
        elif isinstance(item, dict):
            text = item.get("description") or item.get("title") or item.get("type")
            if isinstance(text, str) and text.strip():
                media_items.append(text.strip())
    return media_items


def _has_text(value: Any) -> bool:
    return isinstance(value, str) and bool(value.strip())
