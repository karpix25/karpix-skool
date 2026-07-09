import httpx
import pytest

from app.schemas.generation_sources import GenerationSourceInput, GenerationSourceKind
from app.services.lesson_generation.open_notebook_client import (
    OpenNotebookClient,
    OpenNotebookTransformation,
)
from app.services.lesson_generation.source_brief import parse_source_brief, source_brief_response_json


@pytest.mark.asyncio
async def test_open_notebook_empty_transformation_keeps_source_context_for_fallback():
    def handler(request: httpx.Request) -> httpx.Response:
        path = request.url.path

        if request.method == "GET" and path == "/api/sources":
            return _json_response([{"id": "source:existing", "status": "completed", "title": "Existing"}])
        if request.method == "GET" and path == "/api/sources/source:existing":
            return _json_response(
                {
                    "id": "source:existing",
                    "title": "AI money source",
                    "topics": ["ниша", "оффер"],
                    "full_text": (
                        "Источник объясняет, как выбрать денежную AI-нишу, проверить спрос, "
                        "упаковать оффер и продать первый ручной сервис бизнесу."
                    ),
                }
            )
        if request.method == "GET" and path == "/api/transformations":
            return _json_response([{"id": "transformation:brief", "name": "karpix_source_brief_text"}])
        if request.method == "GET" and path == "/api/models/defaults":
            return _json_response({"default_chat_model": "model:chat"})
        if request.method == "POST" and path == "/api/transformations/execute":
            return _json_response({"output": ""})

        return httpx.Response(404, json={"detail": f"Unexpected {request.method} {path}"})

    client = OpenNotebookClient(
        base_url="http://open-notebook.test/api",
        poll_seconds=0,
        poll_attempts=1,
        transport=httpx.MockTransport(handler),
    )

    response = await client.ask_from_sources(
        sources=[GenerationSourceInput(kind=GenerationSourceKind.open_notebook, content="notebook:existing")],
        question="Return source brief",
        transformation=OpenNotebookTransformation(
            name="karpix_source_brief_text",
            title="Karpix source brief text",
            description="Plain text brief",
            prompt="Return plain text only.",
        ),
    )

    assert response["answer"] == ""
    assert response["empty_output"] is True
    assert response["source_contexts"][0]["title"] == "AI money source"

    source_brief = parse_source_brief(response)

    assert "денежную AI-нишу" in source_brief.text
    assert source_brief.fallback_reason == "open_notebook_empty_transformation_output"
    assert source_brief_response_json(source_brief)["fallback_reason"] == source_brief.fallback_reason


def _json_response(payload, status_code: int = 200) -> httpx.Response:
    return httpx.Response(status_code, json=payload)
