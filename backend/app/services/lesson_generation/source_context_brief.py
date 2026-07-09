from typing import Any, Iterable


MAX_SOURCE_CONTEXT_CHARS = 30000
MAX_SOURCE_CONTEXT_PER_SOURCE_CHARS = 12000


def compact_source_contexts(contexts: Iterable[dict[str, Any]]) -> list[dict[str, Any]]:
    compacted = []
    remaining_chars = MAX_SOURCE_CONTEXT_CHARS
    for context in contexts:
        text = _text(context.get("full_text"))
        if not text or remaining_chars <= 0:
            continue
        excerpt = text[: min(len(text), MAX_SOURCE_CONTEXT_PER_SOURCE_CHARS, remaining_chars)]
        remaining_chars -= len(excerpt)
        compacted.append(
            {
                "source_id": context.get("source_id"),
                "title": context.get("title"),
                "topics": context.get("topics") or [],
                "full_text": excerpt,
                "truncated": len(excerpt) < len(text),
            }
        )
    return compacted


def build_source_context_brief(contexts: Iterable[dict[str, Any]]) -> str:
    sections = []
    for index, context in enumerate(compact_source_contexts(contexts), start=1):
        text = _text(context.get("full_text"))
        if not text:
            continue
        title = _text(context.get("title")) or f"Источник {index}"
        topics = context.get("topics") if isinstance(context.get("topics"), list) else []
        topic_line = ", ".join(_text(topic) for topic in topics if _text(topic))
        sections.append(
            "\n".join(
                part
                for part in [
                    f"Источник {index}: {title}",
                    f"Темы: {topic_line}" if topic_line else "",
                    "Фрагмент источника:",
                    text,
                ]
                if part
            )
        )

    if not sections:
        return ""
    return (
        "Автоматический source brief из обработанных источников Open Notebook. "
        "Используй только эти фрагменты как источник истины.\n\n"
        + "\n\n---\n\n".join(sections)
    )


def _text(value: Any) -> str:
    return value.strip() if isinstance(value, str) else ""
