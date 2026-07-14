import asyncio
import os
from datetime import UTC, datetime
from typing import Any, Optional, Sequence

from ...config import settings
from ...schemas.generation_sources import GenerationSourceInput, GenerationSourceKind
from .provider import LessonGenerationClientError
from .social_video_sources import resolve_social_video_sources


GOOGLE_NOTEBOOKLM_PREFIX = "google_notebooklm:"


class GoogleNotebookLmClient:
    def __init__(
        self,
        *,
        profile: Optional[str] = None,
        home_path: Optional[str] = None,
        source_wait_timeout: Optional[float] = None,
        min_interval_seconds: Optional[float] = None,
        client_context_factory=None,
    ) -> None:
        self.profile = profile if profile is not None else settings.NOTEBOOKLM_PROFILE
        self.home_path = home_path if home_path is not None else settings.NOTEBOOKLM_HOME
        self.source_wait_timeout = (
            settings.NOTEBOOKLM_SOURCE_WAIT_TIMEOUT_SECONDS
            if source_wait_timeout is None
            else source_wait_timeout
        )
        self.min_interval_seconds = (
            settings.NOTEBOOKLM_ASK_MIN_INTERVAL_SECONDS
            if min_interval_seconds is None
            else min_interval_seconds
        )
        self._client_context_factory = client_context_factory

    async def ask_lessons(self, *, source_url: str, question: str) -> dict[str, Any]:
        return await self.ask_from_sources(
            sources=[
                GenerationSourceInput(
                    kind=GenerationSourceKind.link,
                    title=source_url,
                    url=source_url,
                )
            ],
            question=question,
        )

    async def ask_from_sources(
        self,
        *,
        sources: Sequence[GenerationSourceInput],
        question: str,
        notebook_id: str | None = None,
        transformation: Any = None,
    ) -> dict[str, Any]:
        if not sources:
            raise LessonGenerationClientError("At least one source is required")

        existing_notebook_id = google_notebooklm_id_from_value(notebook_id)
        material_sources = _material_sources(sources)
        if not existing_notebook_id and not material_sources:
            raise LessonGenerationClientError("At least one material source is required")

        prepared_sources = (
            await resolve_social_video_sources(material_sources)
            if not existing_notebook_id
            else []
        )

        try:
            async with self._client_context() as client:
                notebook_id_value = existing_notebook_id or await self._create_notebook(client, prepared_sources)
                source_ids = []
                for source in prepared_sources:
                    await self._pace()
                    added_source = await self._add_source(client, notebook_id_value, source)
                    source_id = _object_id(added_source)
                    if source_id:
                        source_ids.append(source_id)

                if not source_ids:
                    source_ids = await self._list_source_ids(client, notebook_id_value)
                if not source_ids:
                    raise LessonGenerationClientError("Google NotebookLM notebook does not contain sources")

                source_contexts = (
                    await self._source_contexts(client, notebook_id_value, source_ids)
                    if getattr(transformation, "include_source_contexts", False)
                    else []
                )
                await self._pace()
                result = await client.chat.ask(notebook_id_value, question)
        except LessonGenerationClientError:
            raise
        except Exception as exc:
            raise LessonGenerationClientError(f"Google NotebookLM request failed: {exc}") from exc

        answer = _result_answer(result)
        payload = {
            "answer": answer,
            "provider": "google_notebooklm",
            "notebook_id": f"{GOOGLE_NOTEBOOKLM_PREFIX}{notebook_id_value}",
            "source_id": source_ids[0] if source_ids else None,
            "source_ids": source_ids,
            "references": _result_references(result),
        }
        if not answer.strip():
            payload["empty_output"] = True
        if source_contexts:
            payload["source_contexts"] = source_contexts
        return payload

    def _client_context(self):
        if self._client_context_factory:
            return self._client_context_factory()

        if self.home_path:
            os.environ["NOTEBOOKLM_HOME"] = self.home_path

        try:
            from notebooklm import NotebookLMClient
        except ImportError as exc:
            raise LessonGenerationClientError(
                "notebooklm-py is not installed. Install notebooklm-py and configure "
                "NOTEBOOKLM_HOME/NOTEBOOKLM_PROFILE before selecting Google NotebookLM."
            ) from exc

        return NotebookLMClient.from_storage(
            profile=self.profile,
            rate_limit_max_retries=3,
            server_error_max_retries=3,
            max_concurrent_uploads=1,
            max_concurrent_rpcs=1,
        )

    async def _create_notebook(
        self,
        client: Any,
        sources: Sequence[GenerationSourceInput],
    ) -> str:
        timestamp = datetime.now(UTC).strftime("%Y-%m-%d %H:%M:%S")
        notebook = await client.notebooks.create(
            f"Karpix generation {timestamp} ({len(sources)} source(s))"
        )
        notebook_id = _object_id(notebook)
        if not notebook_id:
            raise LessonGenerationClientError("Google NotebookLM returned an empty notebook id")
        return notebook_id

    async def _add_source(self, client: Any, notebook_id: str, source: GenerationSourceInput) -> Any:
        if source.kind == GenerationSourceKind.note:
            return await client.sources.add_text(
                notebook_id,
                source.title or "Karpix note",
                source.content or "",
                wait=True,
                wait_timeout=self.source_wait_timeout,
                idempotent=True,
            )
        if not source.url:
            raise LessonGenerationClientError("Google NotebookLM source URL is required")
        return await client.sources.add_url(
            notebook_id,
            source.url,
            wait=True,
            wait_timeout=self.source_wait_timeout,
        )

    async def _list_source_ids(self, client: Any, notebook_id: str) -> list[str]:
        sources = await client.sources.list(notebook_id)
        return [source_id for source_id in (_object_id(source) for source in sources) if source_id]

    async def _source_contexts(
        self,
        client: Any,
        notebook_id: str,
        source_ids: Sequence[str],
    ) -> list[dict[str, Any]]:
        contexts = []
        for source_id in source_ids:
            try:
                source = await client.sources.get(notebook_id, source_id)
                fulltext = await client.sources.get_fulltext(notebook_id, source_id)
            except Exception:
                continue
            content = getattr(fulltext, "content", None)
            if not isinstance(content, str) or not content.strip():
                continue
            contexts.append(
                {
                    "source_id": source_id,
                    "title": getattr(source, "title", None),
                    "topics": [],
                    "full_text": content,
                }
            )
        return contexts

    async def _pace(self) -> None:
        if self.min_interval_seconds > 0:
            await asyncio.sleep(self.min_interval_seconds)


def google_notebooklm_id_from_value(value: str | None) -> str | None:
    clean_value = (value or "").strip()
    if clean_value.startswith(GOOGLE_NOTEBOOKLM_PREFIX):
        return clean_value[len(GOOGLE_NOTEBOOKLM_PREFIX):].strip() or None
    return None


def _material_sources(sources: Sequence[GenerationSourceInput]) -> list[GenerationSourceInput]:
    return [source for source in sources if source.kind != GenerationSourceKind.open_notebook]


def _object_id(value: Any) -> str | None:
    item_id = getattr(value, "id", None)
    if not isinstance(item_id, str):
        return None
    clean_id = item_id.strip()
    return clean_id or None


def _result_answer(result: Any) -> str:
    answer = getattr(result, "answer", None)
    return answer.strip() if isinstance(answer, str) else ""


def _result_references(result: Any) -> list[dict[str, Any]]:
    references = getattr(result, "references", None)
    if not references:
        return []
    items = []
    for reference in references:
        items.append(
            {
                "citation_number": getattr(reference, "citation_number", None),
                "source_id": getattr(reference, "source_id", None),
            }
        )
    return items
