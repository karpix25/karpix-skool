from enum import StrEnum
from pydantic import BaseModel, ConfigDict, Field, ValidationError

from .parser import LessonGenerationParseError
from .tolerant_json import TolerantJsonError, load_tolerant_json


class SourceSufficiency(StrEnum):
    SUFFICIENT = "sufficient"
    PARTIAL = "partial"
    INSUFFICIENT = "insufficient"


class CourseSourceMapPayload(BaseModel):
    """Source-grounded inventory used before curriculum planning."""

    model_config = ConfigDict(extra="ignore", str_strip_whitespace=True)

    confirmed_concepts: list[str] = Field(default_factory=list, max_length=80)
    procedures: list[str] = Field(default_factory=list, max_length=60)
    examples: list[str] = Field(default_factory=list, max_length=60)
    constraints: list[str] = Field(default_factory=list, max_length=40)
    contradictions: list[str] = Field(default_factory=list, max_length=30)
    source_gaps: list[str] = Field(default_factory=list, max_length=40)
    excluded_topics: list[str] = Field(default_factory=list, max_length=40)
    recommended_module_count: int = Field(ge=1, le=12)
    recommended_lesson_count: int = Field(ge=1, le=72)
    sufficiency: SourceSufficiency
    sufficiency_reason: str = Field(min_length=1, max_length=2000)

    @property
    def can_generate_course(self) -> bool:
        return self.sufficiency is not SourceSufficiency.INSUFFICIENT

    @property
    def needs_scope_reduction(self) -> bool:
        return self.sufficiency is SourceSufficiency.PARTIAL


def parse_course_source_map(raw_answer: str) -> CourseSourceMapPayload:
    if not raw_answer.strip():
        raise LessonGenerationParseError("Generator returned an empty course source map response")
    try:
        payload = load_tolerant_json(raw_answer)
    except TolerantJsonError as exc:
        raise LessonGenerationParseError(
            f"Generator returned invalid JSON for course source map: {exc}"
        ) from exc
    if not isinstance(payload, dict):
        raise LessonGenerationParseError("Generator JSON for course source map must be an object")
    nested = payload.get("source_map") or payload.get("course_source_map") or payload
    if not isinstance(nested, dict):
        raise LessonGenerationParseError("Generator course source map must be an object")
    try:
        source_map = CourseSourceMapPayload.model_validate(nested)
    except ValidationError as exc:
        raise LessonGenerationParseError(_validation_message(exc)) from exc
    _validate_source_map(source_map)
    return source_map


def _validate_source_map(source_map: CourseSourceMapPayload) -> None:
    grounded_items = [
        *source_map.confirmed_concepts,
        *source_map.procedures,
        *source_map.examples,
    ]
    if source_map.sufficiency is SourceSufficiency.SUFFICIENT and len(grounded_items) < 3:
        raise LessonGenerationParseError(
            "A sufficient course source map needs at least three grounded knowledge items"
        )
    if source_map.sufficiency is SourceSufficiency.INSUFFICIENT and not source_map.source_gaps:
        raise LessonGenerationParseError(
            "An insufficient course source map must describe at least one source gap"
        )


def _validation_message(exc: ValidationError) -> str:
    details: list[str] = []
    for error in exc.errors()[:5]:
        location = ".".join(str(part) for part in error["loc"]) or "payload"
        details.append(f"{location}: {error['msg']}")
    return f"Generator JSON for course source map is invalid: {'; '.join(details)}"
