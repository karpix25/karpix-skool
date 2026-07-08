import json
from typing import Any, TypeVar

from pydantic import AliasChoices, BaseModel, ConfigDict, Field, ValidationError


class CourseGenerationParseError(ValueError):
    pass


class _PayloadModel(BaseModel):
    model_config = ConfigDict(
        extra="ignore",
        populate_by_name=True,
        str_strip_whitespace=True,
    )


class BlueprintLessonPayload(_PayloadModel):
    title: str = Field(min_length=1, max_length=180)
    learning_outcome: str = Field(
        validation_alias=AliasChoices("learning_outcome", "outcome"),
        min_length=1,
        max_length=600,
    )
    merrill_task: str | None = Field(default=None, max_length=1000)
    source_gap: str | None = Field(default=None, max_length=1000)


class BlueprintModulePayload(_PayloadModel):
    title: str = Field(min_length=1, max_length=180)
    transformation_outcome: str = Field(
        validation_alias=AliasChoices("transformation_outcome", "outcome", "module_outcome"),
        min_length=1,
        max_length=800,
    )
    evidence_of_success: str | None = Field(default=None, max_length=1000)
    lessons: list[BlueprintLessonPayload] = Field(min_length=1, max_length=20)


class CourseBlueprintPayload(_PayloadModel):
    course_title: str | None = Field(
        default=None,
        validation_alias=AliasChoices("course_title", "title"),
        max_length=180,
    )
    transformation_goal: str | None = Field(default=None, max_length=1200)
    modules: list[BlueprintModulePayload] = Field(min_length=1, max_length=20)


class LessonDraftPayload(_PayloadModel):
    title: str = Field(min_length=1, max_length=180)
    learning_outcome: str = Field(
        validation_alias=AliasChoices("learning_outcome", "outcome"),
        min_length=1,
        max_length=600,
    )
    html: str = Field(min_length=1, max_length=50000)
    practice_task: str | None = Field(default=None, max_length=2000)
    source_gaps: list[str] = Field(default_factory=list, max_length=20)


class HumanizedLessonPayload(_PayloadModel):
    title: str | None = Field(default=None, max_length=180)
    html: str = Field(min_length=1, max_length=50000)
    change_notes: list[str] = Field(default_factory=list, max_length=20)


class MediaPlanItemPayload(_PayloadModel):
    lesson_title: str = Field(
        validation_alias=AliasChoices("lesson_title", "title"),
        min_length=1,
        max_length=180,
    )
    media_type: str = Field(min_length=1, max_length=80)
    purpose: str = Field(min_length=1, max_length=1000)
    instruction: str = Field(
        validation_alias=AliasChoices("instruction", "capture_instruction", "description"),
        min_length=1,
        max_length=2000,
    )
    source_basis: str | None = Field(default=None, max_length=1000)
    placement_note: str | None = Field(default=None, max_length=1000)


class MediaPlanPayload(_PayloadModel):
    items: list[MediaPlanItemPayload] = Field(
        validation_alias=AliasChoices("items", "media", "media_items"),
        min_length=1,
        max_length=100,
    )


T = TypeVar("T", bound=BaseModel)


def parse_course_blueprint(raw_answer: str) -> CourseBlueprintPayload:
    payload = _loads_json_object(raw_answer, payload_name="course blueprint")
    return _validate_payload(
        CourseBlueprintPayload,
        _unwrap_object(payload, "course_blueprint", "blueprint"),
        "course blueprint",
    )


def parse_lesson_draft(raw_answer: str) -> LessonDraftPayload:
    payload = _loads_json_object(raw_answer, payload_name="lesson draft")
    return _validate_payload(
        LessonDraftPayload,
        _unwrap_object(payload, "lesson_draft", "lesson"),
        "lesson draft",
    )


def parse_humanized_lesson(raw_answer: str) -> HumanizedLessonPayload:
    payload = _loads_json_object(raw_answer, payload_name="humanized lesson")
    return _validate_payload(
        HumanizedLessonPayload,
        _unwrap_object(payload, "humanized_lesson", "lesson"),
        "humanized lesson",
    )


def parse_media_plan(raw_answer: str) -> MediaPlanPayload:
    payload = _loads_json_value(raw_answer, payload_name="media plan")
    if isinstance(payload, list):
        payload = {"items": payload}
    if not isinstance(payload, dict):
        raise CourseGenerationParseError("Open Notebook JSON for media plan must be an object or array")

    return _validate_payload(
        MediaPlanPayload,
        _unwrap_object(payload, "media_plan", "plan"),
        "media plan",
    )


def _loads_json_object(raw_answer: str, *, payload_name: str) -> dict[str, Any]:
    value = _loads_json_value(raw_answer, payload_name=payload_name)
    if not isinstance(value, dict):
        raise CourseGenerationParseError(f"Open Notebook JSON for {payload_name} must be an object")
    return value


def _loads_json_value(raw_answer: str, *, payload_name: str) -> Any:
    clean_answer = _strip_markdown_fence(raw_answer.strip())
    if not clean_answer:
        raise CourseGenerationParseError(f"Open Notebook returned an empty {payload_name} response")

    try:
        return json.loads(clean_answer)
    except json.JSONDecodeError:
        pass

    decoder = json.JSONDecoder(strict=False)
    for index, char in enumerate(clean_answer):
        if char not in "{[":
            continue
        try:
            value, _end = decoder.raw_decode(clean_answer[index:])
            return value
        except json.JSONDecodeError:
            continue

    raise CourseGenerationParseError(f"Open Notebook returned invalid JSON for {payload_name}")


def _strip_markdown_fence(raw_answer: str) -> str:
    lines = raw_answer.splitlines()
    if len(lines) >= 2 and lines[0].strip().startswith("```") and lines[-1].strip().startswith("```"):
        return "\n".join(lines[1:-1]).strip()
    return raw_answer


def _unwrap_object(payload: dict[str, Any], *keys: str) -> dict[str, Any]:
    for key in keys:
        nested = payload.get(key)
        if isinstance(nested, dict):
            return nested
    return payload


def _validate_payload(model: type[T], payload: dict[str, Any], payload_name: str) -> T:
    try:
        return model.model_validate(payload)
    except ValidationError as exc:
        details = _format_validation_errors(exc)
        raise CourseGenerationParseError(f"Open Notebook JSON for {payload_name} is invalid: {details}") from exc


def _format_validation_errors(exc: ValidationError) -> str:
    messages = []
    for error in exc.errors()[:5]:
        location = ".".join(str(part) for part in error["loc"]) or "payload"
        messages.append(f"{location}: {error['msg']}")
    return "; ".join(messages)
