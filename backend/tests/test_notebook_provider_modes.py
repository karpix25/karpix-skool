from contextlib import asynccontextmanager
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


class FakeNotebookClient:
    def __init__(self):
        self.notebooks = FakeNotebooks()
        self.sources = FakeSources()
        self.chat = FakeChat()


class FakeNotebooks:
    async def create(self, _title):
        return SimpleNamespace(id="nb_1")


class FakeSources:
    async def add_text(self, _notebook_id, title, content, **_kwargs):
        self.source = SimpleNamespace(id="src_1", title=title, content=content)
        return self.source

    async def list(self, _notebook_id):
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
