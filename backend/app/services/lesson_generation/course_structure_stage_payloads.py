from typing import Any

from pydantic import BaseModel, ConfigDict, Field, ValidationError

from ...schemas.lesson_generation import GeneratedLessonPayload
from .parser import LessonGenerationParseError
from .tolerant_json import TolerantJsonError, load_tolerant_json


MIN_SOURCE_PACK_CHARS = 160
MIN_SOURCE_PACK_ITEMS = 3


class _PayloadModel(BaseModel):
    model_config = ConfigDict(extra="ignore", populate_by_name=True, str_strip_whitespace=True)


class CourseBlueprintLessonPayload(_PayloadModel):
    title: str = Field(min_length=1, max_length=180)
    learning_outcome: str = Field(min_length=1, max_length=800)
    student_deliverable: str = Field(min_length=1, max_length=800)
    source_focus: str = Field(min_length=1, max_length=800)


class CourseBlueprintModulePayload(_PayloadModel):
    title: str = Field(min_length=1, max_length=180)
    module_outcome: str = Field(min_length=1, max_length=1000)
    lessons: list[CourseBlueprintLessonPayload] = Field(min_length=1, max_length=12)


class CourseBlueprintPayload(_PayloadModel):
    transformation_goal: str = Field(min_length=1, max_length=1200)
    modules: list[CourseBlueprintModulePayload] = Field(min_length=1, max_length=12)


class LessonSourcePackPayload(_PayloadModel):
    facts: list[str] = Field(default_factory=list, max_length=20)
    process_steps: list[str] = Field(default_factory=list, max_length=20)
    examples: list[str] = Field(default_factory=list, max_length=20)
    constraints: list[str] = Field(default_factory=list, max_length=20)
    source_gaps: list[str] = Field(default_factory=list, max_length=20)
    source_basis_summary: str | None = Field(default=None, max_length=2000)

    def evidence_items(self) -> list[str]:
        return [
            *self.facts,
            *self.process_steps,
            *self.examples,
            *self.constraints,
        ]


def parse_course_blueprint(
    raw_answer: str,
    *,
    module_count: int,
    lessons_per_module: int,
) -> CourseBlueprintPayload:
    payload = _loads_json_object(raw_answer, payload_name="course blueprint")
    try:
        blueprint = CourseBlueprintPayload.model_validate(_unwrap_object(payload, "blueprint", "course_blueprint"))
    except ValidationError as exc:
        raise LessonGenerationParseError(_validation_message("course blueprint", exc)) from exc

    _validate_blueprint_counts(
        blueprint=blueprint,
        module_count=module_count,
        lessons_per_module=lessons_per_module,
    )
    _validate_unique_blueprint_titles(blueprint)
    return blueprint


def parse_lesson_source_pack(raw_answer: str) -> LessonSourcePackPayload:
    payload = _loads_json_object(raw_answer, payload_name="lesson source pack")
    try:
        source_pack = LessonSourcePackPayload.model_validate(
            _unwrap_object(payload, "source_pack", "lesson_source_pack")
        )
    except ValidationError as exc:
        raise LessonGenerationParseError(_validation_message("lesson source pack", exc)) from exc

    _validate_source_pack(source_pack)
    return source_pack


def parse_packaged_lesson(raw_answer: str) -> GeneratedLessonPayload:
    payload = _loads_json_object(raw_answer, payload_name="packaged lesson")
    try:
        return GeneratedLessonPayload.model_validate(_unwrap_object(payload, "lesson", "lesson_draft"))
    except ValidationError as exc:
        raise LessonGenerationParseError(_validation_message("packaged lesson", exc)) from exc


def _loads_json_object(raw_answer: str, *, payload_name: str) -> dict[str, Any]:
    if not raw_answer.strip():
        raise LessonGenerationParseError(f"Generator returned an empty {payload_name} response")
    try:
        payload = load_tolerant_json(raw_answer)
    except TolerantJsonError as exc:
        raise LessonGenerationParseError(f"Generator returned invalid JSON for {payload_name}: {exc}") from exc
    if not isinstance(payload, dict):
        raise LessonGenerationParseError(f"Generator JSON for {payload_name} must be an object")
    return payload


def _unwrap_object(payload: dict[str, Any], *keys: str) -> dict[str, Any]:
    for key in keys:
        nested = payload.get(key)
        if isinstance(nested, dict):
            return nested
    return payload


def _validate_blueprint_counts(
    *,
    blueprint: CourseBlueprintPayload,
    module_count: int,
    lessons_per_module: int,
) -> None:
    if len(blueprint.modules) != module_count:
        raise LessonGenerationParseError(
            f"Expected exactly {module_count} blueprint modules, got {len(blueprint.modules)}"
        )
    for index, module in enumerate(blueprint.modules, start=1):
        if len(module.lessons) != lessons_per_module:
            raise LessonGenerationParseError(
                f"Expected exactly {lessons_per_module} blueprint lessons in module {index}, "
                f"got {len(module.lessons)}"
            )


def _validate_unique_blueprint_titles(blueprint: CourseBlueprintPayload) -> None:
    seen: set[str] = set()
    for module in blueprint.modules:
        _add_unique_title(seen, module.title, "module")
        for lesson in module.lessons:
            _add_unique_title(seen, lesson.title, "lesson")


def _validate_source_pack(source_pack: LessonSourcePackPayload) -> None:
    evidence_items = [item for item in source_pack.evidence_items() if item.strip()]
    evidence_text = " ".join(evidence_items)
    if len(evidence_items) < MIN_SOURCE_PACK_ITEMS or len(evidence_text) < MIN_SOURCE_PACK_CHARS:
        raise LessonGenerationParseError(
            "Open Notebook returned too little source evidence for this lesson"
        )


def _add_unique_title(seen: set[str], title: str, label: str) -> None:
    normalized = " ".join(title.casefold().split())
    if normalized in seen:
        raise LessonGenerationParseError(f"Duplicate blueprint {label} title: {title}")
    seen.add(normalized)


def _validation_message(payload_name: str, exc: ValidationError) -> str:
    details = []
    for error in exc.errors()[:5]:
        location = ".".join(str(part) for part in error["loc"]) or "payload"
        details.append(f"{location}: {error['msg']}")
    return f"Generator JSON for {payload_name} is invalid: {'; '.join(details)}"
