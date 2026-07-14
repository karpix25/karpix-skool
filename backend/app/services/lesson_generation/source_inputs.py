from typing import Any, Iterable, Optional

from ...schemas.generation_sources import (
    GenerationSourceInput,
    GenerationSourceKind,
)
from .open_notebook_sources import open_notebook_id_from_sources
from ..upload_urls import refresh_generation_source_url


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
    normalized = generation_sources_from_request(
        sources=sources,
        legacy_source_url=legacy_source_url,
    )
    return [
        source.model_copy(
            update={"url": refresh_generation_source_url(source.url)}
        )
        if source.url
        else source
        for source in normalized
    ]


def primary_generation_source_ref(sources: Iterable[GenerationSourceInput]) -> str:
    notebook_id = open_notebook_id_from_sources(sources)
    if notebook_id:
        return notebook_id

    for source in sources:
        if source.url:
            return source.url
    return INLINE_SOURCE_REF
