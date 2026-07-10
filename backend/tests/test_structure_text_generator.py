import pytest

from app.config import settings
from app.services.lesson_generation.provider import LessonGenerationClientError
from app.services.lesson_generation.structure_text_generator import (
    DEFAULT_OPENROUTER_MODEL,
    StructureTextGenerator,
)


def test_structure_text_generator_prefers_google_when_configured(monkeypatch):
    monkeypatch.setattr(settings, "COURSE_STRUCTURE_PROVIDER", None)
    monkeypatch.setattr(settings, "GOOGLE_API_KEY", "google-key")
    monkeypatch.setattr(settings, "OPENROUTER_API_KEY", "openrouter-key")
    monkeypatch.setattr(settings, "COURSE_STRUCTURE_MODEL", None)

    generator = StructureTextGenerator()

    assert generator.provider_name == "google"
    assert generator.resolved_model_name == "gemini-1.5-flash"


def test_structure_text_generator_uses_openrouter_fallback(monkeypatch):
    monkeypatch.setattr(settings, "COURSE_STRUCTURE_PROVIDER", None)
    monkeypatch.setattr(settings, "GOOGLE_API_KEY", "")
    monkeypatch.setattr(settings, "OPENROUTER_API_KEY", "openrouter-key")
    monkeypatch.setattr(settings, "COURSE_STRUCTURE_MODEL", None)

    generator = StructureTextGenerator()

    assert generator.provider_name == "openrouter"
    assert generator.resolved_model_name == DEFAULT_OPENROUTER_MODEL


def test_structure_text_generator_uses_configured_model(monkeypatch):
    monkeypatch.setattr(settings, "COURSE_STRUCTURE_PROVIDER", None)
    monkeypatch.setattr(settings, "GOOGLE_API_KEY", "")
    monkeypatch.setattr(settings, "OPENROUTER_API_KEY", "openrouter-key")
    monkeypatch.setattr(settings, "COURSE_STRUCTURE_MODEL", "anthropic/claude-3.5-sonnet")

    generator = StructureTextGenerator()

    assert generator.provider_name == "openrouter"
    assert generator.resolved_model_name == "anthropic/claude-3.5-sonnet"


@pytest.mark.asyncio
async def test_structure_text_generator_requires_configured_provider(monkeypatch):
    monkeypatch.setattr(settings, "COURSE_STRUCTURE_PROVIDER", None)
    monkeypatch.setattr(settings, "GOOGLE_API_KEY", "")
    monkeypatch.setattr(settings, "OPENROUTER_API_KEY", "")

    with pytest.raises(LessonGenerationClientError, match="COURSE_STRUCTURE_PROVIDER"):
        await StructureTextGenerator().generate_text("prompt")
