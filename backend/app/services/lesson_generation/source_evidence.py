import re
from enum import StrEnum
from typing import Any, Iterable

from pydantic import BaseModel, ConfigDict, Field, ValidationError

from .parser import LessonGenerationParseError
from .tolerant_json import TolerantJsonError, load_tolerant_json


class EvidenceKind(StrEnum):
    FACT = "fact"
    PROCESS_STEP = "process_step"
    EXAMPLE = "example"
    CONSTRAINT = "constraint"


class SourceEvidenceItem(BaseModel):
    model_config = ConfigDict(extra="ignore", str_strip_whitespace=True)

    kind: EvidenceKind
    claim: str = Field(min_length=1, max_length=2000)
    quote: str = Field(min_length=1, max_length=4000)
    source_id: str = Field(min_length=1, max_length=255)
    source_title: str = Field(min_length=1, max_length=500)
    location_hint: str | None = Field(default=None, max_length=500)
    lesson_use: str = Field(min_length=1, max_length=1000)


class LessonEvidencePack(BaseModel):
    model_config = ConfigDict(extra="ignore", str_strip_whitespace=True)

    evidence: list[SourceEvidenceItem] = Field(default_factory=list, max_length=80)
    source_gaps: list[str] = Field(default_factory=list, max_length=40)
    sufficiency: str = Field(default="sufficient", pattern="^(sufficient|partial|insufficient)$")
    source_basis_summary: str | None = Field(default=None, max_length=2000)


class EvidenceVerificationIssue(BaseModel):
    evidence_index: int
    code: str
    message: str


class EvidenceVerificationReport(BaseModel):
    verified_indices: list[int] = Field(default_factory=list)
    issues: list[EvidenceVerificationIssue] = Field(default_factory=list)

    @property
    def is_valid(self) -> bool:
        return not self.issues


def parse_lesson_evidence_pack(raw_answer: str) -> LessonEvidencePack:
    if not raw_answer.strip():
        raise LessonGenerationParseError("Generator returned an empty lesson evidence pack response")
    try:
        payload = load_tolerant_json(raw_answer)
    except TolerantJsonError as exc:
        raise LessonGenerationParseError(
            f"Generator returned invalid JSON for lesson evidence pack: {exc}"
        ) from exc
    if not isinstance(payload, dict):
        raise LessonGenerationParseError("Generator JSON for lesson evidence pack must be an object")
    nested = payload.get("evidence_pack") or payload.get("lesson_evidence_pack") or payload
    if not isinstance(nested, dict):
        raise LessonGenerationParseError("Generator lesson evidence pack must be an object")
    try:
        pack = LessonEvidencePack.model_validate(nested)
    except ValidationError as exc:
        details: list[str] = []
        for error in exc.errors()[:5]:
            location = ".".join(str(part) for part in error["loc"]) or "payload"
            details.append(f"{location}: {error['msg']}")
        raise LessonGenerationParseError(
            f"Generator JSON for lesson evidence pack is invalid: {'; '.join(details)}"
        ) from exc
    if pack.sufficiency == "sufficient" and not pack.evidence:
        raise LessonGenerationParseError("A sufficient lesson evidence pack cannot be empty")
    if pack.sufficiency == "insufficient" and not pack.source_gaps:
        raise LessonGenerationParseError(
            "An insufficient lesson evidence pack must describe at least one source gap"
        )
    return pack


def verify_evidence_pack(
    pack: LessonEvidencePack,
    source_contexts: Iterable[dict[str, Any]],
) -> EvidenceVerificationReport:
    """Verify IDs and exact normalized quote presence without model judgment."""
    contexts = {
        str(context.get("source_id", "")).strip(): context
        for context in source_contexts
        if str(context.get("source_id", "")).strip()
    }
    verified: list[int] = []
    issues: list[EvidenceVerificationIssue] = []
    for index, item in enumerate(pack.evidence):
        context = contexts.get(item.source_id)
        if context is None:
            issues.append(
                EvidenceVerificationIssue(
                    evidence_index=index,
                    code="unknown_source_id",
                    message=f'Source "{item.source_id}" is not present in the source context',
                )
            )
            continue
        source_text = _context_text(context)
        if not source_text or _normalize(item.quote) not in _normalize(source_text):
            issues.append(
                EvidenceVerificationIssue(
                    evidence_index=index,
                    code="quote_not_found",
                    message=f'Quote was not found in source "{item.source_id}"',
                )
            )
            continue
        verified.append(index)
    return EvidenceVerificationReport(verified_indices=verified, issues=issues)


def legacy_source_pack_to_evidence(pack: Any) -> LessonEvidencePack:
    """Preserve legacy packs while marking them as uncited, partial evidence."""
    evidence: list[SourceEvidenceItem] = []
    field_kinds = (
        ("facts", EvidenceKind.FACT),
        ("process_steps", EvidenceKind.PROCESS_STEP),
        ("examples", EvidenceKind.EXAMPLE),
        ("constraints", EvidenceKind.CONSTRAINT),
    )
    for field_name, kind in field_kinds:
        for value in getattr(pack, field_name, []) or []:
            evidence.append(
                SourceEvidenceItem(
                    kind=kind,
                    claim=value,
                    quote=value,
                    source_id="legacy:uncited",
                    source_title="Legacy source pack",
                    lesson_use=_trim_lesson_use(value),
                )
            )
    gaps = list(getattr(pack, "source_gaps", []) or [])
    return LessonEvidencePack(
        evidence=evidence,
        source_gaps=gaps,
        sufficiency="partial" if evidence else "insufficient",
        source_basis_summary=getattr(pack, "source_basis_summary", None),
    )


def _context_text(context: dict[str, Any]) -> str:
    for key in ("full_text", "text", "content"):
        value = context.get(key)
        if isinstance(value, str) and value.strip():
            return value
    return ""


def _trim_lesson_use(value: str) -> str:
    return value if len(value) <= 1000 else value[:997].rstrip() + "..."


def _normalize(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip().casefold()
