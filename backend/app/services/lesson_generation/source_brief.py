from dataclasses import dataclass
from typing import Any

from .parser import GenerationUnanswerableError, LessonGenerationParseError, UNANSWERABLE_MESSAGE
from .source_context_brief import build_source_context_brief


MIN_SOURCE_BRIEF_LENGTH = 80
SOURCE_BRIEF_TRANSFORMATION_NAME = "karpix_source_brief_text"


@dataclass(frozen=True)
class SourceBrief:
    text: str
    response: dict[str, Any]
    fallback_reason: str | None = None


def parse_source_brief(source_response: dict[str, Any] | None) -> SourceBrief:
    answer = (source_response or {}).get("answer")
    fallback_reason = None
    if isinstance(answer, str) and answer.strip():
        text = answer.strip()
    else:
        text = build_source_context_brief((source_response or {}).get("source_contexts") or [])
        fallback_reason = "open_notebook_empty_transformation_output" if text else None
    if not text:
        raise LessonGenerationParseError("Open Notebook returned an empty source brief")

    if _is_unanswerable_source_brief(text):
        raise GenerationUnanswerableError(UNANSWERABLE_MESSAGE)
    if len(text) < MIN_SOURCE_BRIEF_LENGTH:
        raise LessonGenerationParseError("Open Notebook source brief was too short")

    return SourceBrief(text=text, response=source_response or {}, fallback_reason=fallback_reason)


def source_brief_response_json(source_brief: SourceBrief) -> dict[str, Any]:
    payload = {
        "provider": "open_notebook",
        "notebook_id": source_brief.response.get("notebook_id"),
        "source_id": source_brief.response.get("source_id"),
        "source_ids": source_brief.response.get("source_ids"),
        "transformation_id": source_brief.response.get("transformation_id"),
        "model_id": source_brief.response.get("model_id"),
        "answer": source_brief.text,
    }
    if source_brief.fallback_reason:
        payload["fallback_reason"] = source_brief.fallback_reason
    return payload


def _is_unanswerable_source_brief(text: str) -> bool:
    normalized = " ".join(text.casefold().split())
    return (
        "я пока не могу вам ответить" in normalized
        or "i can't answer" in normalized
        or "i cannot answer" in normalized
        or "not enough information" in normalized
    )
