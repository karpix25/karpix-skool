import json

import httpx
import pytest

from app.services.lesson_generation.open_notebook_client import OpenNotebookClient


@pytest.mark.asyncio
async def test_open_notebook_client_processes_source_and_executes_transformation():
    requests = []

    def handler(request: httpx.Request) -> httpx.Response:
        requests.append(request)
        path = request.url.path

        if request.method == "POST" and path == "/api/notebooks":
            return _json_response({"id": "notebook:1", "name": "Karpix", "description": ""})
        if request.method == "POST" and path == "/api/sources/json":
            payload = json.loads(request.content)
            assert payload["notebooks"] == ["notebook:1"]
            assert payload["url"] == "https://example.com/source"
            assert payload["async_processing"] is True
            return _json_response({"id": "source:1", "status": "new"})
        if request.method == "GET" and path == "/api/sources/source:1/status":
            return _json_response({"status": "completed", "message": "done"})
        if request.method == "GET" and path == "/api/sources/source:1":
            return _json_response(
                {
                    "id": "source:1",
                    "title": "Source",
                    "topics": ["topic"],
                    "full_text": "Useful source text",
                }
            )
        if request.method == "GET" and path == "/api/transformations":
            return _json_response(
                [
                    {
                        "id": "transformation:1",
                        "name": "karpix_lesson_generation_json",
                    }
                ]
            )
        if request.method == "GET" and path == "/api/models/defaults":
            return _json_response({"default_chat_model": "model:chat"})
        if request.method == "POST" and path == "/api/transformations/execute":
            payload = json.loads(request.content)
            assert payload["transformation_id"] == "transformation:1"
            assert payload["model_id"] == "model:chat"
            assert "Useful source text" in payload["input_text"]
            return _json_response({"output": '{"lessons":[]}'})

        return httpx.Response(404, json={"detail": f"Unexpected {request.method} {path}"})

    client = OpenNotebookClient(
        base_url="http://open-notebook.test/api",
        password="secret",
        poll_seconds=0,
        poll_attempts=1,
        transport=httpx.MockTransport(handler),
    )

    result = await client.ask_lessons(
        source_url="https://example.com/source",
        question="Create lessons",
    )

    assert result["answer"] == '{"lessons":[]}'
    assert result["provider"] == "open_notebook"
    assert all(request.headers["authorization"] == "Bearer secret" for request in requests)


def _json_response(payload: dict | list) -> httpx.Response:
    return httpx.Response(200, json=payload)
