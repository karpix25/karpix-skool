import asyncio
import json
from datetime import UTC, datetime
from typing import Any, Optional

import httpx

from ...config import settings
from .provider import LessonGenerationClientError


SOURCE_DONE_STATUSES = {None, "completed"}
SOURCE_FAILED_STATUSES = {"failed", "cancelled", "canceled"}
TRANSFORMATION_NAME = "karpix_lesson_generation_json"


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
        async with httpx.AsyncClient(timeout=self.timeout_seconds, transport=self._transport) as client:
            notebook = await self._create_notebook(client, source_url)
            source = await self._create_source(client, notebook["id"], source_url)
            source_id = source["id"]
            await self._wait_for_source(client, source_id)
            context = await self._get_source_context(client, source_id)
            transformation_id = await self._ensure_transformation(client)
            model_id = await self._get_transformation_model_id(client)
            answer = await self._execute_transformation(
                client,
                transformation_id=transformation_id,
                model_id=model_id,
                question=question,
                context=context,
            )

        return {
            "answer": answer,
            "provider": "open_notebook",
            "notebook_id": notebook["id"],
            "source_id": source_id,
            "transformation_id": transformation_id,
            "model_id": model_id,
        }

    async def _create_notebook(self, client: httpx.AsyncClient, source_url: str) -> dict[str, Any]:
        timestamp = datetime.now(UTC).strftime("%Y-%m-%d %H:%M:%S")
        payload = {
            "name": f"Karpix generation {timestamp}",
            "description": f"Temporary Karpix lesson generation notebook for {source_url}",
        }
        return await self._request_json(client, "POST", "/notebooks", json=payload)

    async def _create_source(
        self,
        client: httpx.AsyncClient,
        notebook_id: str,
        source_url: str,
    ) -> dict[str, Any]:
        payload = {
            "type": "link",
            "notebooks": [notebook_id],
            "url": source_url,
            "title": source_url,
            "embed": self.embed_sources,
            "async_processing": True,
        }
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

    async def _ensure_transformation(self, client: httpx.AsyncClient) -> str:
        transformations = await self._request_json(client, "GET", "/transformations")
        for transformation in transformations:
            if transformation.get("name") == TRANSFORMATION_NAME:
                return transformation["id"]

        payload = {
            "name": TRANSFORMATION_NAME,
            "title": "Karpix lesson generation JSON",
            "description": "Generates strict Karpix LMS JSON from source context.",
            "prompt": (
                "You generate LMS course drafts for Karpix. Follow the task in the input "
                "text exactly. Use only the supplied source context. Return valid JSON only."
            ),
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
            raise LessonGenerationClientError("Open Notebook transformation returned an empty output")
        return output

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


def _http_error_message(response: httpx.Response) -> str:
    try:
        payload = response.json()
    except ValueError:
        payload = {}
    detail = payload.get("detail") or payload.get("message") or response.text[:500]
    return f"Open Notebook API HTTP {response.status_code}: {detail}"
