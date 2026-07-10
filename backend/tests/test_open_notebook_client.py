import json

import httpx
import pytest

from app.schemas.generation_sources import GenerationSourceInput, GenerationSourceKind
from app.services.lesson_generation.open_notebook_client import OpenNotebookClient, OpenNotebookTransformation
from app.services.lesson_generation.provider import LessonGenerationClientError


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


@pytest.mark.asyncio
async def test_open_notebook_client_can_use_plain_text_brief_transformation():
    created_transformations = []

    def handler(request: httpx.Request) -> httpx.Response:
        path = request.url.path

        if request.method == "GET" and path == "/api/sources":
            return _json_response([
                {"id": "source:existing", "status": "completed", "title": "Existing"}
            ])
        if request.method == "GET" and path == "/api/sources/source:existing":
            return _json_response(
                {
                    "id": "source:existing",
                    "title": "Existing",
                    "topics": [],
                    "full_text": "Source text for a plain brief.",
                }
            )
        if request.method == "GET" and path == "/api/transformations":
            return _json_response([])
        if request.method == "POST" and path == "/api/transformations":
            payload = json.loads(request.content)
            created_transformations.append(payload)
            return _json_response({"id": "transformation:brief", **payload})
        if request.method == "GET" and path == "/api/models/defaults":
            return _json_response({"default_chat_model": "model:chat"})
        if request.method == "POST" and path == "/api/transformations/execute":
            payload = json.loads(request.content)
            assert payload["transformation_id"] == "transformation:brief"
            return _json_response({"output": "Plain source-grounded brief"})

        return httpx.Response(404, json={"detail": f"Unexpected {request.method} {path}"})

    client = OpenNotebookClient(
        base_url="http://open-notebook.test/api",
        password="secret",
        poll_seconds=0,
        poll_attempts=1,
        transport=httpx.MockTransport(handler),
    )

    result = await client.ask_from_sources(
        sources=[
            GenerationSourceInput(
                kind=GenerationSourceKind.open_notebook,
                content="notebook:existing",
            )
        ],
        question="Return plain text",
        transformation=OpenNotebookTransformation(
            name="karpix_source_brief_text",
            title="Karpix source brief text",
            description="Plain text brief",
            prompt="Return plain text only.",
        ),
    )

    assert result["answer"] == "Plain source-grounded brief"
    assert created_transformations[0]["name"] == "karpix_source_brief_text"
    assert created_transformations[0]["prompt"] == "Return plain text only."


@pytest.mark.asyncio
async def test_open_notebook_client_adds_multiple_source_types():
    source_ids = ["source:link", "source:note"]
    created_payloads = []

    def handler(request: httpx.Request) -> httpx.Response:
        path = request.url.path

        if request.method == "POST" and path == "/api/notebooks":
            return _json_response({"id": "notebook:multi", "name": "Karpix", "description": ""})
        if request.method == "POST" and path == "/api/sources/json":
            payload = json.loads(request.content)
            created_payloads.append(payload)
            return _json_response({"id": source_ids[len(created_payloads) - 1], "status": "new"})
        if request.method == "GET" and path.endswith("/status"):
            return _json_response({"status": "completed"})
        if request.method == "GET" and path == "/api/sources/source:link":
            return _json_response({"id": "source:link", "title": "Link", "topics": [], "full_text": "Link text"})
        if request.method == "GET" and path == "/api/sources/source:note":
            return _json_response({"id": "source:note", "title": "Note", "topics": [], "full_text": "Note text"})
        if request.method == "GET" and path == "/api/transformations":
            return _json_response([{"id": "transformation:1", "name": "karpix_lesson_generation_json"}])
        if request.method == "GET" and path == "/api/models/defaults":
            return _json_response({"default_chat_model": "model:chat"})
        if request.method == "POST" and path == "/api/transformations/execute":
            payload = json.loads(request.content)
            assert "Link text" in payload["input_text"]
            assert "Note text" in payload["input_text"]
            return _json_response({"output": '{"modules":[]}'})

        return httpx.Response(404, json={"detail": f"Unexpected {request.method} {path}"})

    client = OpenNotebookClient(
        base_url="http://open-notebook.test/api",
        password="secret",
        poll_seconds=0,
        poll_attempts=1,
        transport=httpx.MockTransport(handler),
    )

    result = await client.ask_from_sources(
        sources=[
            GenerationSourceInput(
                kind=GenerationSourceKind.link,
                title="Link",
                url="https://example.com/source",
            ),
            GenerationSourceInput(
                kind=GenerationSourceKind.note,
                title="Note",
                content="Local notes",
            ),
        ],
        question="Create course",
    )

    assert result["source_ids"] == source_ids
    assert created_payloads[0]["type"] == "link"
    assert created_payloads[0]["url"] == "https://example.com/source"
    assert created_payloads[1]["type"] == "text"
    assert created_payloads[1]["content"] == "Local notes"


@pytest.mark.asyncio
async def test_open_notebook_client_creates_all_sources_before_waiting_for_processing():
    source_ids = ["source:first", "source:second"]
    created_payloads = []

    def handler(request: httpx.Request) -> httpx.Response:
        path = request.url.path

        if request.method == "POST" and path == "/api/notebooks":
            return _json_response({"id": "notebook:batch", "name": "Karpix", "description": ""})
        if request.method == "POST" and path == "/api/sources/json":
            payload = json.loads(request.content)
            created_payloads.append(payload)
            return _json_response({"id": source_ids[len(created_payloads) - 1], "status": "new"})
        if request.method == "GET" and path == "/api/sources/source:first/status":
            return _json_response({"status": "failed", "message": "First source failed"})

        return httpx.Response(404, json={"detail": f"Unexpected {request.method} {path}"})

    client = OpenNotebookClient(
        base_url="http://open-notebook.test/api",
        poll_seconds=0,
        poll_attempts=1,
        transport=httpx.MockTransport(handler),
    )

    with pytest.raises(LessonGenerationClientError, match="First source failed"):
        await client.ask_from_sources(
            sources=[
                GenerationSourceInput(
                    kind=GenerationSourceKind.link,
                    title="First",
                    url="https://example.com/first",
                ),
                GenerationSourceInput(
                    kind=GenerationSourceKind.link,
                    title="Second",
                    url="https://example.com/second",
                ),
            ],
            question="Create course",
        )

    assert [payload["url"] for payload in created_payloads] == [
        "https://example.com/first",
        "https://example.com/second",
    ]
    assert all(payload["notebooks"] == ["notebook:batch"] for payload in created_payloads)


@pytest.mark.asyncio
async def test_open_notebook_client_reuses_existing_course_notebook():
    created_payloads = []

    def handler(request: httpx.Request) -> httpx.Response:
        path = request.url.path

        if request.method == "POST" and path == "/api/notebooks":
            return httpx.Response(500, json={"detail": "Notebook should be reused"})
        if request.method == "POST" and path == "/api/sources/json":
            payload = json.loads(request.content)
            created_payloads.append(payload)
            return _json_response({"id": "source:course", "status": "new"})
        if request.method == "GET" and path == "/api/sources":
            assert request.url.params["notebook_id"] == "notebook:course"
            return _json_response([])
        if request.method == "GET" and path == "/api/sources/source:course/status":
            return _json_response({"status": "completed"})
        if request.method == "GET" and path == "/api/sources/source:course":
            return _json_response({
                "id": "source:course",
                "title": "Course note",
                "topics": [],
                "full_text": "Course notebook context",
            })
        if request.method == "GET" and path == "/api/transformations":
            return _json_response([{"id": "transformation:1", "name": "karpix_lesson_generation_json"}])
        if request.method == "GET" and path == "/api/models/defaults":
            return _json_response({"default_chat_model": "model:chat"})
        if request.method == "POST" and path == "/api/transformations/execute":
            payload = json.loads(request.content)
            assert '"notebook_id": "notebook:course"' in payload["input_text"]
            return _json_response({"output": '{"lessons":[]}'})

        return httpx.Response(404, json={"detail": f"Unexpected {request.method} {path}"})

    client = OpenNotebookClient(
        base_url="http://open-notebook.test/api",
        poll_seconds=0,
        poll_attempts=1,
        transport=httpx.MockTransport(handler),
    )

    result = await client.ask_from_sources(
        sources=[
            GenerationSourceInput(
                kind=GenerationSourceKind.note,
                title="Course note",
                content="Extra material",
            )
        ],
        question="Create one lesson",
        notebook_id=" notebook:course ",
    )

    assert result["notebook_id"] == "notebook:course"
    assert created_payloads[0]["notebooks"] == ["notebook:course"]
    assert created_payloads[0]["content"] == "Extra material"


@pytest.mark.asyncio
async def test_open_notebook_client_does_not_duplicate_explicit_notebook_sources(monkeypatch):
    requested_paths = []

    async def fail_if_resolved(_sources):
        raise AssertionError("Existing notebook sources should be reused")

    monkeypatch.setattr(
        "app.services.lesson_generation.open_notebook_client.resolve_social_video_sources",
        fail_if_resolved,
    )

    def handler(request: httpx.Request) -> httpx.Response:
        requested_paths.append((request.method, request.url.path))
        if request.method == "GET" and request.url.path == "/api/sources":
            return _json_response([{"id": "source:existing", "status": "completed"}])
        if request.method == "GET" and request.url.path == "/api/sources/source:existing":
            return _json_response({
                "id": "source:existing",
                "title": "Existing",
                "topics": [],
                "full_text": "Existing source context",
            })
        if request.method == "GET" and request.url.path == "/api/transformations":
            return _json_response([{"id": "transformation:1", "name": "karpix_lesson_generation_json"}])
        if request.method == "GET" and request.url.path == "/api/models/defaults":
            return _json_response({"default_chat_model": "model:chat"})
        if request.method == "POST" and request.url.path == "/api/transformations/execute":
            return _json_response({"output": '{"lessons":[]}'})
        return httpx.Response(404, json={"detail": "Unexpected request"})

    client = OpenNotebookClient(
        base_url="http://open-notebook.test/api",
        transport=httpx.MockTransport(handler),
    )
    result = await client.ask_from_sources(
        sources=[GenerationSourceInput(kind=GenerationSourceKind.youtube, url="https://youtu.be/abc")],
        question="Create one lesson",
        notebook_id="notebook:course",
    )

    assert result["source_ids"] == ["source:existing"]
    assert ("POST", "/api/sources/json") not in requested_paths


@pytest.mark.asyncio
async def test_open_notebook_client_uses_existing_notebook_sources_without_creating_source():
    requested_paths = []

    def handler(request: httpx.Request) -> httpx.Response:
        requested_paths.append((request.method, request.url.path))
        path = request.url.path

        if request.method == "GET" and path == "/api/sources":
            assert request.url.params["notebook_id"] == "notebook:existing"
            return _json_response({
                "items": [
                    {"id": "source:ready", "title": "Ready", "topics": [], "status": "completed"},
                    {"id": "source:empty", "title": "Empty", "topics": [], "status": "completed"},
                    {"id": "source:failed", "title": "Failed", "topics": [], "status": "failed"},
                ]
            })
        if request.method == "GET" and path == "/api/sources/source:ready":
            return _json_response({
                "id": "source:ready",
                "title": "Ready",
                "topics": ["topic"],
                "full_text": "Existing notebook source text",
            })
        if request.method == "GET" and path == "/api/sources/source:empty":
            return _json_response({
                "id": "source:empty",
                "title": "Empty",
                "topics": [],
                "full_text": "",
            })
        if request.method == "GET" and path == "/api/transformations":
            return _json_response([{"id": "transformation:1", "name": "karpix_lesson_generation_json"}])
        if request.method == "GET" and path == "/api/models/defaults":
            return _json_response({"default_chat_model": "model:chat"})
        if request.method == "POST" and path == "/api/transformations/execute":
            payload = json.loads(request.content)
            assert "Existing notebook source text" in payload["input_text"]
            assert '"source_count": 1' in payload["input_text"]
            return _json_response({"output": '{"modules":[]}'})

        return httpx.Response(404, json={"detail": f"Unexpected {request.method} {path}"})

    client = OpenNotebookClient(
        base_url="http://open-notebook.test/api",
        poll_seconds=0,
        poll_attempts=1,
        transport=httpx.MockTransport(handler),
    )

    result = await client.ask_from_sources(
        sources=[
            GenerationSourceInput(
                kind=GenerationSourceKind.open_notebook,
                url="https://notebook.karpix.com/notebooks/notebook%3Aexisting",
            )
        ],
        question="Create course",
    )

    assert result["notebook_id"] == "notebook:existing"
    assert result["source_ids"] == ["source:ready"]
    assert ("POST", "/api/notebooks") not in requested_paths
    assert ("POST", "/api/sources/json") not in requested_paths


@pytest.mark.asyncio
async def test_open_notebook_client_resolves_social_video_sources_before_creating_sources(monkeypatch):
    created_payloads = []

    async def fake_resolve_social_video_sources(sources):
        assert sources[0].kind == GenerationSourceKind.tiktok
        return [
            GenerationSourceInput(
                kind=GenerationSourceKind.note,
                title="TikTok transcript",
                content="Resolved TikTok transcript text",
            )
        ]

    monkeypatch.setattr(
        "app.services.lesson_generation.open_notebook_client.resolve_social_video_sources",
        fake_resolve_social_video_sources,
    )

    def handler(request: httpx.Request) -> httpx.Response:
        path = request.url.path

        if request.method == "POST" and path == "/api/notebooks":
            return _json_response({"id": "notebook:social", "name": "Karpix", "description": ""})
        if request.method == "POST" and path == "/api/sources/json":
            payload = json.loads(request.content)
            created_payloads.append(payload)
            return _json_response({"id": "source:social", "status": "new"})
        if request.method == "GET" and path == "/api/sources/source:social/status":
            return _json_response({"status": "completed"})
        if request.method == "GET" and path == "/api/sources/source:social":
            return _json_response({
                "id": "source:social",
                "title": "TikTok transcript",
                "topics": [],
                "full_text": "Resolved TikTok transcript text",
            })
        if request.method == "GET" and path == "/api/transformations":
            return _json_response([{"id": "transformation:1", "name": "karpix_lesson_generation_json"}])
        if request.method == "GET" and path == "/api/models/defaults":
            return _json_response({"default_chat_model": "model:chat"})
        if request.method == "POST" and path == "/api/transformations/execute":
            return _json_response({"output": '{"modules":[]}'})

        return httpx.Response(404, json={"detail": f"Unexpected {request.method} {path}"})

    client = OpenNotebookClient(
        base_url="http://open-notebook.test/api",
        poll_seconds=0,
        poll_attempts=1,
        transport=httpx.MockTransport(handler),
    )

    await client.ask_from_sources(
        sources=[
            GenerationSourceInput(
                kind=GenerationSourceKind.tiktok,
                title="TikTok",
                url="https://www.tiktok.com/@user/video/123",
            )
        ],
        question="Create course",
    )

    assert created_payloads[0]["type"] == "text"
    assert created_payloads[0]["content"] == "Resolved TikTok transcript text"


def _json_response(payload: dict | list) -> httpx.Response:
    return httpx.Response(200, json=payload)
