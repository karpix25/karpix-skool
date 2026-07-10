from dataclasses import dataclass
from typing import Literal, Optional, cast

from ...config import settings
from .provider import LessonGenerationClientError


CourseModelProvider = Literal["google", "openrouter"]
CourseModelRole = Literal["planner", "writer", "reviewer"]

DEFAULT_GOOGLE_MODEL = "gemini-1.5-flash"
DEFAULT_OPENROUTER_MODEL = "openai/gpt-4o-mini"

_ROLE_SETTING_NAMES: dict[CourseModelRole, str] = {
    "planner": "COURSE_PLANNER_MODEL",
    "writer": "COURSE_WRITER_MODEL",
    "reviewer": "COURSE_REVIEWER_MODEL",
}


@dataclass(frozen=True)
class CourseModelRoute:
    provider: CourseModelProvider
    model: str
    role: Optional[CourseModelRole] = None

    def as_dict(self) -> dict[str, str]:
        result = {"provider": self.provider, "model": self.model}
        if self.role:
            result["role"] = self.role
        return result


def resolve_course_model_route(
    *,
    role: Optional[CourseModelRole] = None,
    model_name: Optional[str] = None,
) -> CourseModelRoute:
    provider = _resolve_provider(role=role, model_name=model_name)
    model = _resolve_model(provider=provider, role=role, model_name=model_name)
    _validate_provider_key(provider)
    _validate_model_id(provider=provider, model=model)
    return CourseModelRoute(provider=provider, model=model, role=role)


def _resolve_provider(
    *,
    role: Optional[CourseModelRole],
    model_name: Optional[str],
) -> CourseModelProvider:
    configured = settings.COURSE_STRUCTURE_PROVIDER
    if configured:
        return cast(CourseModelProvider, configured)
    model_hint = model_name
    if not model_hint and role:
        model_hint = getattr(settings, _ROLE_SETTING_NAMES[role])
    model_hint = model_hint or settings.COURSE_STRUCTURE_MODEL
    if model_hint:
        normalized = model_hint.strip().lower()
        if normalized.startswith(("gemini-", "models/gemini-")):
            return "google"
        if "/" in normalized:
            return "openrouter"
    # Backwards compatibility for environments that have not selected a provider yet.
    if settings.GOOGLE_API_KEY:
        return "google"
    if settings.OPENROUTER_API_KEY:
        return "openrouter"
    raise LessonGenerationClientError(
        "COURSE_STRUCTURE_PROVIDER and its API key are required for course generation; "
        "configure provider=google with GOOGLE_API_KEY or provider=openrouter with OPENROUTER_API_KEY"
    )


def _resolve_model(
    *,
    provider: CourseModelProvider,
    role: Optional[CourseModelRole],
    model_name: Optional[str],
) -> str:
    candidates = [model_name]
    if role:
        candidates.append(getattr(settings, _ROLE_SETTING_NAMES[role]))
    candidates.append(settings.COURSE_STRUCTURE_MODEL)
    for candidate in candidates:
        if candidate and candidate.strip():
            return candidate.strip()
    return DEFAULT_GOOGLE_MODEL if provider == "google" else DEFAULT_OPENROUTER_MODEL


def _validate_provider_key(provider: CourseModelProvider) -> None:
    if provider == "google" and not settings.GOOGLE_API_KEY:
        raise LessonGenerationClientError(
            "COURSE_STRUCTURE_PROVIDER=google requires GOOGLE_API_KEY"
        )
    if provider == "openrouter" and not settings.OPENROUTER_API_KEY:
        raise LessonGenerationClientError(
            "COURSE_STRUCTURE_PROVIDER=openrouter requires OPENROUTER_API_KEY"
        )


def _validate_model_id(*, provider: CourseModelProvider, model: str) -> None:
    normalized = model.lower()
    if provider == "google" and normalized.startswith("google/"):
        raise LessonGenerationClientError(
            f'Google provider model "{model}" is an OpenRouter model ID; '
            "use a direct ID such as gemini-2.5-flash or set COURSE_STRUCTURE_PROVIDER=openrouter"
        )
    if provider == "openrouter" and normalized.startswith(("gemini-", "models/gemini-")):
        raise LessonGenerationClientError(
            f'OpenRouter model "{model}" is a direct Google model ID; '
            "use an OpenRouter ID such as google/gemini-2.5-flash"
        )
