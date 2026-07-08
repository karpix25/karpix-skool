from typing import Any, Iterable, Optional

from ...schemas.generation_sources import (
    GenerationSourceInput,
    GenerationSourceKind,
)


INLINE_SOURCE_REF = "karpix://inline-sources"


def generation_sources_from_request(
    *,
    sources: Optional[Iterable[GenerationSourceInput]],
    legacy_source_url: Optional[str],
) -> list[GenerationSourceInput]:
    normalized = list(sources or [])
    if normalized:
        return normalized

    if legacy_source_url:
        return [
            GenerationSourceInput(
                kind=GenerationSourceKind.link,
                url=legacy_source_url,
                title=legacy_source_url,
            )
        ]

    raise ValueError("At least one source is required")


def generation_sources_from_job(
    *,
    request_json: Optional[dict[str, Any]],
    legacy_source_url: Optional[str],
) -> list[GenerationSourceInput]:
    raw_sources = (request_json or {}).get("sources")
    sources = [
        GenerationSourceInput.model_validate(source)
        for source in raw_sources or []
        if isinstance(source, dict)
    ]
    return generation_sources_from_request(
        sources=sources,
        legacy_source_url=legacy_source_url,
    )


def primary_generation_source_ref(sources: Iterable[GenerationSourceInput]) -> str:
    for source in sources:
        if source.url:
            return source.url
    return INLINE_SOURCE_REF
