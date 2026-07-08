from dataclasses import dataclass
from typing import Any

from .parser import GenerationUnanswerableError, LessonGenerationParseError, UNANSWERABLE_MESSAGE


MIN_SOURCE_BRIEF_LENGTH = 80
SOURCE_BRIEF_TRANSFORMATION_NAME = "karpix_source_brief_text"


@dataclass(frozen=True)
class SourceBrief:
    text: str
    response: dict[str, Any]


def parse_source_brief(source_response: dict[str, Any] | None) -> SourceBrief:
    answer = (source_response or {}).get("answer")
    if not isinstance(answer, str) or not answer.strip():
        raise LessonGenerationParseError("Open Notebook returned an empty source brief")

    text = answer.strip()
    if _is_unanswerable_source_brief(text):
        raise GenerationUnanswerableError(UNANSWERABLE_MESSAGE)
    if len(text) < MIN_SOURCE_BRIEF_LENGTH:
        raise LessonGenerationParseError("Open Notebook source brief was too short")

    return SourceBrief(text=text, response=source_response or {})


def source_brief_response_json(source_brief: SourceBrief) -> dict[str, Any]:
    return {
        "provider": "open_notebook",
        "notebook_id": source_brief.response.get("notebook_id"),
        "source_id": source_brief.response.get("source_id"),
        "source_ids": source_brief.response.get("source_ids"),
        "transformation_id": source_brief.response.get("transformation_id"),
        "model_id": source_brief.response.get("model_id"),
        "answer": source_brief.text,
    }


def _is_unanswerable_source_brief(text: str) -> bool:
    normalized = " ".join(text.casefold().split())
    return (
        "я пока не могу вам ответить" in normalized
        or "i can't answer" in normalized
        or "i cannot answer" in normalized
        or "not enough information" in normalized
    )
