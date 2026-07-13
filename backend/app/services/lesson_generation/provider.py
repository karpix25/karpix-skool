from typing import Any, Protocol, Sequence

from ...models import NotebookGenerationProvider
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


def create_lesson_generation_provider(
    provider: NotebookGenerationProvider | str | None = None,
) -> LessonGenerationProvider:
    resolved_provider = NotebookGenerationProvider(provider or NotebookGenerationProvider.open_notebook)
    if resolved_provider is NotebookGenerationProvider.google_notebooklm:
        from .notebooklm_py_client import GoogleNotebookLmClient

        return GoogleNotebookLmClient()

    from .open_notebook_client import OpenNotebookClient
    return OpenNotebookClient()


async def create_lesson_generation_provider_from_settings(session) -> LessonGenerationProvider:
    from ..platform_generation_settings import get_effective_notebook_provider

    return create_lesson_generation_provider(await get_effective_notebook_provider(session))
