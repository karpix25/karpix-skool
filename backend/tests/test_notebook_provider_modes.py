from contextlib import asynccontextmanager
import sys
from types import SimpleNamespace

import pytest

from app.models import NotebookGenerationProvider
from app.schemas.generation_sources import GenerationSourceInput, GenerationSourceKind
from app.services.lesson_generation.notebooklm_py_client import (
    GOOGLE_NOTEBOOKLM_PREFIX,
    GoogleNotebookLmClient,
    google_notebooklm_id_from_value,
)
from app.services.lesson_generation.open_notebook_client import OpenNotebookClient
from app.services.lesson_generation.provider import create_lesson_generation_provider


def test_provider_factory_defaults_to_open_notebook():
    assert isinstance(create_lesson_generation_provider(), OpenNotebookClient)


def test_provider_factory_creates_google_notebooklm_client():
    provider = create_lesson_generation_provider(NotebookGenerationProvider.google_notebooklm)
    assert isinstance(provider, GoogleNotebookLmClient)


def test_google_notebooklm_id_requires_provider_prefix():
    assert google_notebooklm_id_from_value("notebook:old-open-notebook") is None
    assert google_notebooklm_id_from_value(f"{GOOGLE_NOTEBOOKLM_PREFIX}abc") == "abc"


def test_google_notebooklm_client_resolves_profile_inside_home(monkeypatch, tmp_path):
    calls = []

    class FakeClientClass:
        @classmethod
        def from_storage(cls, **kwargs):
            calls.append(kwargs)
            return object()

    monkeypatch.setitem(sys.modules, "notebooklm", SimpleNamespace(NotebookLMClient=FakeClientClass))
    client = GoogleNotebookLmClient(profile="standard", home_path=str(tmp_path))

    client._client_context()

    assert calls[0]["profile"] == "standard"
    assert "path" not in calls[0]


@pytest.mark.asyncio
async def test_google_notebooklm_client_returns_provider_payload_without_real_api():
    fake_client = FakeNotebookClient()

    @asynccontextmanager
    async def fake_context():
        yield fake_client

    client = GoogleNotebookLmClient(
        client_context_factory=fake_context,
        min_interval_seconds=0,
        source_wait_timeout=1,
    )

    response = await client.ask_from_sources(
        sources=[
            GenerationSourceInput(
                kind=GenerationSourceKind.note,
                title="Source",
                content="Fact one.",
            )
        ],
        question="Summarize as JSON",
        transformation=SimpleNamespace(include_source_contexts=True),
    )

    assert response["provider"] == "google_notebooklm"
    assert response["notebook_id"] == f"{GOOGLE_NOTEBOOKLM_PREFIX}nb_1"
    assert response["answer"] == '{"ok": true}'
    assert response["source_ids"] == ["src_1"]
    assert response["source_contexts"][0]["full_text"] == "Fact one."
    assert fake_client.sources.add_text_kwargs == {
        "wait": True,
        "wait_timeout": 1,
    }


@pytest.mark.asyncio
async def test_google_notebooklm_client_imports_youtube_url_directly(monkeypatch):
    fake_client = FakeNotebookClient()
    youtube_url = "https://www.youtube.com/watch?v=karpix"

    async def fail_if_transcript_resolver_runs(_sources):
        raise AssertionError("YouTube URLs should be imported directly into Google NotebookLM")

    @asynccontextmanager
    async def fake_context():
        yield fake_client

    monkeypatch.setattr(
        "app.services.lesson_generation.notebooklm_py_client.resolve_social_video_sources",
        fail_if_transcript_resolver_runs,
    )
    client = GoogleNotebookLmClient(
        client_context_factory=fake_context,
        min_interval_seconds=0,
        source_wait_timeout=1,
    )

    response = await client.ask_from_sources(
        sources=[
            GenerationSourceInput(
                kind=GenerationSourceKind.youtube,
                title="Video lesson",
                url=youtube_url,
            )
        ],
        question="Summarize as JSON",
    )

    assert response["provider"] == "google_notebooklm"
    assert response["source_ids"] == ["src_1"]
    assert fake_client.sources.add_text_kwargs == {}
    assert fake_client.sources.add_url_calls == [
        {
            "notebook_id": "nb_1",
            "url": youtube_url,
            "kwargs": {
                "wait": True,
                "wait_timeout": 1,
            },
        }
    ]


@pytest.mark.asyncio
async def test_google_notebooklm_client_retries_incomplete_chunked_chat_read():
    fake_chat = FlakyChat(
        RuntimeError(
            "chat.ask network error after retries: peer closed connection without sending "
            "complete message body (incomplete chunked read)"
        ),
        RuntimeError(
            "chat.ask network error after retries: peer closed connection without sending "
            "complete message body (incomplete chunked read)"
        ),
    )
    fake_client = FakeNotebookClient(chat=fake_chat)

    @asynccontextmanager
    async def fake_context():
        yield fake_client

    client = GoogleNotebookLmClient(
        client_context_factory=fake_context,
        min_interval_seconds=0,
        source_wait_timeout=1,
        chat_ask_attempts=3,
        chat_ask_retry_backoff_seconds=0,
    )

    response = await client.ask_from_sources(
        sources=[
            GenerationSourceInput(
                kind=GenerationSourceKind.note,
                title="Source",
                content="Fact one.",
            )
        ],
        question="Summarize as JSON",
    )

    assert response["answer"] == '{"ok": true}'
    assert fake_chat.ask_count == 3


class FakeNotebookClient:
    def __init__(self, *, chat=None):
        self.notebooks = FakeNotebooks()
        self.sources = FakeSources()
        self.chat = chat or FakeChat()


class FakeNotebooks:
    async def create(self, _title):
        return SimpleNamespace(id="nb_1")


class FakeSources:
    def __init__(self):
        self.add_text_kwargs = {}
        self.add_url_calls = []
        self.source = None

    async def add_text(self, _notebook_id, title, content, **_kwargs):
        self.add_text_kwargs = _kwargs
        self.source = SimpleNamespace(id="src_1", title=title, content=content)
        return self.source

    async def add_url(self, notebook_id, url, **kwargs):
        self.add_url_calls.append(
            {
                "notebook_id": notebook_id,
                "url": url,
                "kwargs": kwargs,
            }
        )
        self.source = SimpleNamespace(id="src_1", title=url, content=f"Full text for {url}")
        return self.source

    async def list(self, _notebook_id):
        if self.source is None:
            return []
        return [self.source]

    async def get(self, _notebook_id, _source_id):
        return self.source

    async def get_fulltext(self, _notebook_id, _source_id):
        return SimpleNamespace(content=self.source.content)


class FakeChat:
    async def ask(self, _notebook_id, _question):
        return SimpleNamespace(
            answer='{"ok": true}',
            references=[SimpleNamespace(citation_number=1, source_id="src_1")],
        )


class FlakyChat(FakeChat):
    def __init__(self, *failures):
        self.failures = list(failures)
        self.ask_count = 0

    async def ask(self, notebook_id, question):
        self.ask_count += 1
        if self.failures:
            raise self.failures.pop(0)
        return await super().ask(notebook_id, question)
