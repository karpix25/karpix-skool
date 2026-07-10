from typing import Any

from pydantic import BaseModel, ConfigDict, Field, ValidationError

from .parser import LessonGenerationParseError
from .tolerant_json import TolerantJsonError, load_tolerant_json


class LessonReviewScores(BaseModel):
    model_config = ConfigDict(extra="ignore")

    source_grounding: int = Field(ge=0, le=100)
    goal_alignment: int = Field(ge=0, le=100)
    practice_alignment: int = Field(ge=0, le=100)
    artifact_quality: int = Field(ge=0, le=100)
    course_continuity: int = Field(ge=0, le=100)
    clarity: int = Field(ge=0, le=100)


class LessonReviewIssue(BaseModel):
    model_config = ConfigDict(extra="ignore", str_strip_whitespace=True)

    code: str = Field(min_length=1, max_length=100)
    message: str = Field(min_length=1, max_length=2000)
    section: str | None = Field(default=None, max_length=200)
    repair_instruction: str | None = Field(default=None, max_length=2000)
    evidence_indices: list[int] = Field(default_factory=list, max_length=30)


class LessonReviewPayload(BaseModel):
    model_config = ConfigDict(extra="ignore", str_strip_whitespace=True)

    scores: LessonReviewScores
    issues: list[LessonReviewIssue] = Field(default_factory=list, max_length=40)
    summary: str = Field(min_length=1, max_length=2000)


def parse_lesson_review(raw_answer: str) -> LessonReviewPayload:
    if not raw_answer.strip():
        raise LessonGenerationParseError("Generator returned an empty lesson review response")
    try:
        payload = load_tolerant_json(raw_answer)
    except TolerantJsonError as exc:
        raise LessonGenerationParseError(
            f"Generator returned invalid JSON for lesson review: {exc}"
        ) from exc
    if not isinstance(payload, dict):
        raise LessonGenerationParseError("Generator JSON for lesson review must be an object")
    nested: Any = payload.get("review") or payload.get("lesson_review") or payload
    if not isinstance(nested, dict):
        raise LessonGenerationParseError("Generator lesson review must be an object")
    try:
        return LessonReviewPayload.model_validate(nested)
    except ValidationError as exc:
        details: list[str] = []
        for error in exc.errors()[:5]:
            location = ".".join(str(part) for part in error["loc"]) or "payload"
            details.append(f"{location}: {error['msg']}")
        raise LessonGenerationParseError(
            f"Generator JSON for lesson review is invalid: {'; '.join(details)}"
        ) from exc
