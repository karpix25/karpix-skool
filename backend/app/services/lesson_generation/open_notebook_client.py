import asyncio
import json
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Any, Optional, Sequence

import httpx

from ...config import settings
from ...schemas.generation_sources import GenerationSourceInput, GenerationSourceKind
from .open_notebook_sources import open_notebook_id_from_sources
from .provider import LessonGenerationClientError
from .social_video_sources import resolve_social_video_sources
from .source_context_brief import compact_source_contexts


SOURCE_DONE_STATUSES = {None, "completed"}
SOURCE_FAILED_STATUSES = {"failed", "cancelled", "canceled"}
TRANSFORMATION_NAME = "karpix_lesson_generation_json"


@dataclass(frozen=True)
class OpenNotebookTransformation:
    name: str
    title: str
    description: str
    prompt: str
    include_source_contexts: bool = False


DEFAULT_TRANSFORMATION = OpenNotebookTransformation(
    name=TRANSFORMATION_NAME,
    title="Karpix lesson generation JSON",
    description="Generates strict Karpix LMS JSON from source context.",
    prompt=(
        "You generate LMS course drafts for Karpix. Follow the task in the input "
        "text exactly. Use only the supplied source context. Return valid JSON only."
    ),
)


class OpenNotebookClient:
    def __init__(
        self,
        *,
        base_url: Optional[str] = None,
        password: Optional[str] = None,
        timeout_seconds: Optional[int] = None,
        poll_seconds: Optional[float] = None,
        poll_attempts: Optional[int] = None,
        transport: Optional[httpx.AsyncBaseTransport] = None,
    ):
        self.base_url = _normalize_api_url(base_url or settings.OPEN_NOTEBOOK_API_URL)
        self.password = password if password is not None else settings.OPEN_NOTEBOOK_PASSWORD
        self.timeout_seconds = timeout_seconds or settings.OPEN_NOTEBOOK_ANSWER_TIMEOUT_SECONDS
        self.poll_seconds = (
            settings.OPEN_NOTEBOOK_SOURCE_POLL_SECONDS if poll_seconds is None else poll_seconds
        )
        self.poll_attempts = (
            settings.OPEN_NOTEBOOK_SOURCE_POLL_ATTEMPTS if poll_attempts is None else poll_attempts
        )
        self.embed_sources = settings.OPEN_NOTEBOOK_EMBED_SOURCES
        self.transformation_model_id = settings.OPEN_NOTEBOOK_TRANSFORMATION_MODEL_ID
        self._transport = transport

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
        notebook_id: Optional[str] = None,
        transformation: OpenNotebookTransformation = DEFAULT_TRANSFORMATION,
    ) -> dict[str, Any]:
        if not sources:
            raise LessonGenerationClientError("At least one source is required")

        requested_notebook_id = open_notebook_id_from_sources(sources)
        effective_notebook_id = (notebook_id or requested_notebook_id or "").strip() or None
        material_sources = [
            source for source in sources
            if source.kind != GenerationSourceKind.open_notebook
        ]
        if not effective_notebook_id and not material_sources:
            raise LessonGenerationClientError("At least one material source is required")

        prepared_sources = await resolve_social_video_sources(material_sources)

        async with httpx.AsyncClient(timeout=self.timeout_seconds, transport=self._transport) as client:
            notebook = await self._resolve_notebook(client, prepared_sources, effective_notebook_id)
            existing_contexts = await self._get_notebook_source_contexts(client, notebook["id"]) if effective_notebook_id else []
            created_source_ids = []
            for source_input in prepared_sources:
                source = await self._create_source(client, notebook["id"], source_input)
                created_source_ids.append(source["id"])

            created_contexts = []
            for source_id in created_source_ids:
                await self._wait_for_source(client, source_id)
                created_contexts.append(await self._get_source_context(client, source_id))

            contexts = [*existing_contexts, *created_contexts]
            if not contexts:
                raise LessonGenerationClientError("Open Notebook notebook does not contain processed sources")

            transformation_id = await self._ensure_transformation(client, transformation)
            model_id = await self._get_transformation_model_id(client)
            answer = await self._execute_transformation(
                client,
                transformation_id=transformation_id,
                model_id=model_id,
                question=question,
                context={
                    "notebook_id": notebook["id"],
                    "source_count": len(contexts),
                    "sources": contexts,
                },
            )

        source_ids = [context["source_id"] for context in contexts]
        result = {
            "answer": answer,
            "provider": "open_notebook",
            "notebook_id": notebook["id"],
            "source_id": source_ids[0] if source_ids else None,
            "source_ids": source_ids,
            "transformation_id": transformation_id,
            "model_id": model_id,
        }
        if not answer.strip():
            result["empty_output"] = True
            result["source_contexts"] = compact_source_contexts(contexts)
        elif transformation.include_source_contexts:
            result["source_contexts"] = contexts
        return result

    async def _resolve_notebook(
        self,
        client: httpx.AsyncClient,
        sources: Sequence[GenerationSourceInput],
        notebook_id: Optional[str],
    ) -> dict[str, Any]:
        existing_notebook_id = (notebook_id or "").strip()
        if existing_notebook_id:
            return {"id": existing_notebook_id}
        return await self._create_notebook(client, sources)

    async def _create_notebook(
        self,
        client: httpx.AsyncClient,
        sources: Sequence[GenerationSourceInput],
    ) -> dict[str, Any]:
        timestamp = datetime.now(UTC).strftime("%Y-%m-%d %H:%M:%S")
        payload = {
            "name": f"Karpix generation {timestamp}",
            "description": f"Temporary Karpix lesson generation notebook with {len(sources)} source(s)",
        }
        return await self._request_json(client, "POST", "/notebooks", json=payload)

    async def _create_source(
        self,
        client: httpx.AsyncClient,
        notebook_id: str,
        source: GenerationSourceInput,
    ) -> dict[str, Any]:
        payload = _open_notebook_source_payload(source, notebook_id, self.embed_sources)
        return await self._request_json(client, "POST", "/sources/json", json=payload)

    async def _wait_for_source(self, client: httpx.AsyncClient, source_id: str) -> None:
        for _attempt in range(self.poll_attempts):
            status_payload = await self._request_json(client, "GET", f"/sources/{source_id}/status")
            status = status_payload.get("status")
            if status in SOURCE_DONE_STATUSES:
                return
            if status in SOURCE_FAILED_STATUSES:
                message = status_payload.get("message") or "Open Notebook source processing failed"
                raise LessonGenerationClientError(message)
            await asyncio.sleep(self.poll_seconds)
        raise LessonGenerationClientError("Open Notebook source processing timed out")

    async def _get_notebook_source_contexts(
        self,
        client: httpx.AsyncClient,
        notebook_id: str,
    ) -> list[dict[str, Any]]:
        source_payload = await self._request_json(
            client,
            "GET",
            "/sources",
            params={"notebook_id": notebook_id, "limit": 100},
        )
        sources = _source_list_from_payload(source_payload)
        if not isinstance(sources, list):
            raise LessonGenerationClientError("Open Notebook returned invalid source list")

        contexts = []
        for source in sources:
            source_id = _source_id_from_payload(source)
            if not source_id:
                continue
            status = source.get("status") if isinstance(source, dict) else None
            if status in SOURCE_FAILED_STATUSES:
                continue
            if status not in SOURCE_DONE_STATUSES:
                try:
                    await self._wait_for_source(client, source_id)
                except LessonGenerationClientError:
                    continue
            context = await self._get_optional_source_context(client, source_id)
            if context:
                contexts.append(context)
        return contexts

    async def _get_source_context(self, client: httpx.AsyncClient, source_id: str) -> dict[str, Any]:
        source = await self._request_json(client, "GET", f"/sources/{source_id}")
        full_text = source.get("full_text")
        if not isinstance(full_text, str) or not full_text.strip():
            raise LessonGenerationClientError("Open Notebook returned empty source text")
        return {
            "source_id": source_id,
            "title": source.get("title"),
            "topics": source.get("topics") or [],
            "full_text": full_text,
        }

    async def _get_optional_source_context(
        self,
        client: httpx.AsyncClient,
        source_id: str,
    ) -> Optional[dict[str, Any]]:
        try:
            return await self._get_source_context(client, source_id)
        except LessonGenerationClientError as exc:
            if "empty source text" in str(exc):
                return None
            raise

    async def _ensure_transformation(
        self,
        client: httpx.AsyncClient,
        transformation_spec: OpenNotebookTransformation,
    ) -> str:
        transformations = await self._request_json(client, "GET", "/transformations")
        for transformation in transformations:
            if transformation.get("name") == transformation_spec.name:
                return transformation["id"]

        payload = {
            "name": transformation_spec.name,
            "title": transformation_spec.title,
            "description": transformation_spec.description,
            "prompt": transformation_spec.prompt,
            "apply_default": False,
            "model_id": self.transformation_model_id,
        }
        transformation = await self._request_json(client, "POST", "/transformations", json=payload)
        return transformation["id"]

    async def _get_transformation_model_id(self, client: httpx.AsyncClient) -> Optional[str]:
        if self.transformation_model_id:
            return self.transformation_model_id

        defaults = await self._request_json(client, "GET", "/models/defaults")
        model_id = (
            defaults.get("default_transformation_model")
            or defaults.get("large_context_model")
            or defaults.get("default_chat_model")
        )
        if not model_id:
            raise LessonGenerationClientError("Open Notebook language model is not configured")
        return model_id

    async def _execute_transformation(
        self,
        client: httpx.AsyncClient,
        *,
        transformation_id: str,
        model_id: Optional[str],
        question: str,
        context: dict[str, Any],
    ) -> str:
        input_text = (
            f"Task:\n{question}\n\n"
            f"Open Notebook source context:\n{json.dumps(context, ensure_ascii=False)}"
        )
        payload = {
            "transformation_id": transformation_id,
            "model_id": model_id,
            "input_text": input_text,
        }
        response = await self._request_json(client, "POST", "/transformations/execute", json=payload)
        output = response.get("output")
        if not isinstance(output, str) or not output.strip():
            return ""
        return output.strip()

    async def _request_json(self, client: httpx.AsyncClient, method: str, path: str, **kwargs) -> Any:
        if not self.base_url:
            raise LessonGenerationClientError("OPEN_NOTEBOOK_API_URL is not configured")

        try:
            response = await client.request(
                method,
                f"{self.base_url}{path}",
                headers=self._headers(),
                **kwargs,
            )
        except httpx.HTTPError as exc:
            raise LessonGenerationClientError(f"Open Notebook request failed: {exc}") from exc

        if response.status_code >= 400:
            raise LessonGenerationClientError(_http_error_message(response))
        return response.json()

    def _headers(self) -> dict[str, str]:
        if not self.password:
            return {}
        return {"Authorization": f"Bearer {self.password}"}


def _normalize_api_url(value: Optional[str]) -> str:
    clean_value = (value or "").strip().rstrip("/")
    if not clean_value:
        return ""
    return clean_value if clean_value.endswith("/api") else f"{clean_value}/api"


def _open_notebook_source_payload(
    source: GenerationSourceInput,
    notebook_id: str,
    embed_sources: bool,
) -> dict[str, Any]:
    base_payload: dict[str, Any] = {
        "notebooks": [notebook_id],
        "title": source.title or source.url or "Karpix note",
        "embed": embed_sources,
        "async_processing": True,
    }

    if source.kind == GenerationSourceKind.note:
        return {
            **base_payload,
            "type": "text",
            "content": source.content or "",
        }

    return {
        **base_payload,
        "type": "link",
        "url": source.url,
    }


def _source_id_from_payload(source: Any) -> Optional[str]:
    if not isinstance(source, dict):
        return None
    source_id = source.get("id")
    if not isinstance(source_id, str):
        return None
    clean_source_id = source_id.strip()
    return clean_source_id or None


def _source_list_from_payload(payload: Any) -> Any:
    if isinstance(payload, list):
        return payload
    if not isinstance(payload, dict):
        return payload
    for key in ("items", "sources", "data", "results"):
        sources = payload.get(key)
        if isinstance(sources, list):
            return sources
    return payload


def _http_error_message(response: httpx.Response) -> str:
    try:
        payload = response.json()
    except ValueError:
        payload = {}
    detail = payload.get("detail") or payload.get("message") or response.text[:500]
    return f"Open Notebook API HTTP {response.status_code}: {detail}"
