import pytest

from app.config import settings
from app.services.lesson_generation.course_model_routing import resolve_course_model_route
from app.services.lesson_generation.provider import LessonGenerationClientError
from app.services.lesson_generation.structure_text_generator import StructureTextGenerator


def _configure_openrouter(monkeypatch) -> None:
    monkeypatch.setattr(settings, "COURSE_STRUCTURE_PROVIDER", "openrouter")
    monkeypatch.setattr(settings, "OPENROUTER_API_KEY", "openrouter-key")
    monkeypatch.setattr(settings, "GOOGLE_API_KEY", "google-key")
    monkeypatch.setattr(settings, "COURSE_STRUCTURE_MODEL", "google/gemini-2.5-flash")
    monkeypatch.setattr(settings, "COURSE_PLANNER_MODEL", None)
    monkeypatch.setattr(settings, "COURSE_WRITER_MODEL", None)
    monkeypatch.setattr(settings, "COURSE_REVIEWER_MODEL", None)


def test_explicit_provider_wins_when_both_keys_exist(monkeypatch):
    _configure_openrouter(monkeypatch)

    route = resolve_course_model_route()

    assert route.provider == "openrouter"
    assert route.model == "google/gemini-2.5-flash"


@pytest.mark.parametrize(
    ("role", "setting_name", "configured_model"),
    [
        ("planner", "COURSE_PLANNER_MODEL", "anthropic/claude-3.7-sonnet"),
        ("writer", "COURSE_WRITER_MODEL", "google/gemini-2.5-pro"),
        ("reviewer", "COURSE_REVIEWER_MODEL", "openai/gpt-4.1"),
    ],
)
def test_role_model_overrides_shared_model(monkeypatch, role, setting_name, configured_model):
    _configure_openrouter(monkeypatch)
    monkeypatch.setattr(settings, setting_name, configured_model)

    route = resolve_course_model_route(role=role)

    assert route.model == configured_model
    assert route.role == role


def test_explicit_constructor_model_overrides_role_model(monkeypatch):
    _configure_openrouter(monkeypatch)
    monkeypatch.setattr(settings, "COURSE_WRITER_MODEL", "google/gemini-2.5-pro")

    generator = StructureTextGenerator(
        role="writer",
        model_name="anthropic/claude-sonnet-4",
    )

    assert generator.model_metadata() == {
        "provider": "openrouter",
        "model": "anthropic/claude-sonnet-4",
        "role": "writer",
    }


def test_role_model_falls_back_to_shared_model(monkeypatch):
    _configure_openrouter(monkeypatch)

    route = resolve_course_model_route(role="writer")

    assert route.model == "google/gemini-2.5-flash"


def test_google_rejects_openrouter_model_id_before_network(monkeypatch):
    monkeypatch.setattr(settings, "COURSE_STRUCTURE_PROVIDER", "google")
    monkeypatch.setattr(settings, "GOOGLE_API_KEY", "google-key")
    monkeypatch.setattr(settings, "COURSE_STRUCTURE_MODEL", "google/gemini-2.5-flash")

    with pytest.raises(LessonGenerationClientError, match="OpenRouter model ID"):
        resolve_course_model_route()


def test_openrouter_rejects_direct_google_model_id_before_network(monkeypatch):
    _configure_openrouter(monkeypatch)
    monkeypatch.setattr(settings, "COURSE_STRUCTURE_MODEL", "gemini-2.5-flash")

    with pytest.raises(LessonGenerationClientError, match="direct Google model ID"):
        resolve_course_model_route()


@pytest.mark.parametrize(
    ("provider", "missing_key", "message"),
    [
        ("google", "GOOGLE_API_KEY", "requires GOOGLE_API_KEY"),
        ("openrouter", "OPENROUTER_API_KEY", "requires OPENROUTER_API_KEY"),
    ],
)
def test_explicit_provider_requires_matching_key(monkeypatch, provider, missing_key, message):
    monkeypatch.setattr(settings, "COURSE_STRUCTURE_PROVIDER", provider)
    monkeypatch.setattr(settings, "GOOGLE_API_KEY", "google-key")
    monkeypatch.setattr(settings, "OPENROUTER_API_KEY", "openrouter-key")
    monkeypatch.setattr(settings, missing_key, "")
    monkeypatch.setattr(settings, "COURSE_STRUCTURE_MODEL", None)

    with pytest.raises(LessonGenerationClientError, match=message):
        resolve_course_model_route()
