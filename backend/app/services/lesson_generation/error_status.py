from ...models_generation import LessonGenerationJobStatus
from .notebooklm_client import NotebookLMClientError


def notebook_client_error_status(exc: NotebookLMClientError) -> LessonGenerationJobStatus:
    message = str(exc).lower()
    invalid_notebook_markers = (
        "invalid notebook",
        "notebook not found",
        "notebook url",
        "cannot access notebook",
        "permission",
        "404",
    )
    if any(marker in message for marker in invalid_notebook_markers):
        return LessonGenerationJobStatus.invalid_notebook
    return LessonGenerationJobStatus.failed
