from typing import Optional

import httpx

from ...config import settings
from .provider import LessonGenerationClientError


DEFAULT_GOOGLE_MODEL = "gemini-1.5-flash"
DEFAULT_OPENROUTER_MODEL = "openai/gpt-4o-mini"
OPENROUTER_TIMEOUT_SECONDS = 120


class StructureTextGenerator:
    def __init__(self, *, model_name: Optional[str] = None):
        self.model_name = model_name

    @property
    def provider_name(self) -> str:
        if settings.GOOGLE_API_KEY:
            return "google_gemini"
        if settings.OPENROUTER_API_KEY:
            return "openrouter"
        return "unconfigured"

    @property
    def resolved_model_name(self) -> str:
        if self.model_name:
            return self.model_name
        if settings.COURSE_STRUCTURE_MODEL:
            return settings.COURSE_STRUCTURE_MODEL
        if settings.GOOGLE_API_KEY:
            return DEFAULT_GOOGLE_MODEL
        return DEFAULT_OPENROUTER_MODEL

    async def generate_text(self, prompt: str) -> str:
        if settings.GOOGLE_API_KEY:
            return await self._generate_google_text(prompt)
        if settings.OPENROUTER_API_KEY:
            return await self._generate_openrouter_text(prompt)
        raise LessonGenerationClientError(
            "GOOGLE_API_KEY or OPENROUTER_API_KEY is required for course structure generation"
        )

    async def _generate_google_text(self, prompt: str) -> str:
        try:
            from google import generativeai as genai

            genai.configure(api_key=settings.GOOGLE_API_KEY)
            model = genai.GenerativeModel(self.resolved_model_name)
            response = await model.generate_content_async(prompt)
        except Exception as exc:
            raise LessonGenerationClientError(f"Course structure generation failed: {exc}") from exc

        return _required_text(getattr(response, "text", None))

    async def _generate_openrouter_text(self, prompt: str) -> str:
        base_url = settings.OPENROUTER_BASE_URL.rstrip("/")
        payload = {
            "model": self.resolved_model_name,
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0.2,
            "response_format": {"type": "json_object"},
        }
        headers = {
            "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
            "Content-Type": "application/json",
        }
        try:
            async with httpx.AsyncClient(timeout=OPENROUTER_TIMEOUT_SECONDS) as client:
                response = await client.post(f"{base_url}/chat/completions", json=payload, headers=headers)
                response.raise_for_status()
                data = response.json()
        except httpx.HTTPStatusError as exc:
            detail = exc.response.text[:500]
            raise LessonGenerationClientError(
                f"Course structure generation failed: OpenRouter HTTP {exc.response.status_code}: {detail}"
            ) from exc
        except (httpx.HTTPError, ValueError) as exc:
            raise LessonGenerationClientError(f"Course structure generation failed: {exc}") from exc

        try:
            content = data["choices"][0]["message"]["content"]
        except (KeyError, IndexError, TypeError) as exc:
            raise LessonGenerationClientError("Course structure generator returned an invalid response") from exc
        return _required_text(content)


def _required_text(value: Optional[str]) -> str:
    if not isinstance(value, str) or not value.strip():
        raise LessonGenerationClientError("Course structure generator returned an empty output")
    return value.strip()

