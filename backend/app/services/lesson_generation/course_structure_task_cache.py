from dataclasses import dataclass
from typing import Any

from .course_structure_stage_payloads import LessonSourcePackPayload
from .source_evidence import LessonEvidencePack


CACHE_VERSION = "lesson-evidence-v1"


@dataclass(frozen=True)
class LessonSourceCache:
    source_pack: LessonSourcePackPayload
    evidence_pack: LessonEvidencePack


def build_lesson_source_cache(
    *,
    source_fingerprint: str,
    source_pack: LessonSourcePackPayload,
    evidence_pack: LessonEvidencePack,
) -> dict[str, Any]:
    return {
        "cache_version": CACHE_VERSION,
        "source_fingerprint": source_fingerprint,
        "source_pack": source_pack.model_dump(mode="json"),
        "evidence_pack": evidence_pack.model_dump(mode="json"),
    }


def read_lesson_source_cache(
    payload: dict[str, Any] | None,
    *,
    source_fingerprint: str,
) -> LessonSourceCache | None:
    if not payload or payload.get("cache_version") != CACHE_VERSION:
        return None
    if payload.get("source_fingerprint") != source_fingerprint:
        return None
    try:
        return LessonSourceCache(
            source_pack=LessonSourcePackPayload.model_validate(payload.get("source_pack")),
            evidence_pack=LessonEvidencePack.model_validate(payload.get("evidence_pack")),
        )
    except (TypeError, ValueError):
        return None
