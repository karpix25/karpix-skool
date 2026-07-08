from typing import Any, Protocol


class LessonGenerationClientError(RuntimeError):
    pass


class LessonGenerationProvider(Protocol):
    async def ask_lessons(self, *, source_url: str, question: str) -> dict[str, Any]:
        pass


def create_lesson_generation_provider() -> LessonGenerationProvider:
    from .open_notebook_client import OpenNotebookClient

    return OpenNotebookClient()
