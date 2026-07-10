from typing import Any, Protocol, Sequence

from ...schemas.generation_sources import GenerationSourceInput


class LessonGenerationClientError(RuntimeError):
    pass


class TransientSourceFetchError(LessonGenerationClientError):
    pass


class LessonGenerationProvider(Protocol):
    async def ask_lessons(self, *, source_url: str, question: str) -> dict[str, Any]:
        pass

    async def ask_from_sources(
        self,
        *,
        sources: Sequence[GenerationSourceInput],
        question: str,
        notebook_id: str | None = None,
        transformation: Any = None,
    ) -> dict[str, Any]:
        pass


def create_lesson_generation_provider() -> LessonGenerationProvider:
    from .open_notebook_client import OpenNotebookClient

    return OpenNotebookClient()
