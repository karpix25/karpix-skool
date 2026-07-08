from ...models_generation import LessonGenerationJobStatus
from .parser import GenerationUnanswerableError, LessonGenerationParseError
from .provider import LessonGenerationClientError


def generation_client_error_status(exc: LessonGenerationClientError) -> LessonGenerationJobStatus:
    message = str(exc).lower()
    invalid_source_markers = (
        "invalid source",
        "source not found",
        "source url",
        "source link",
        "empty source",
        "cannot access",
        "permission",
        "404",
    )
    if any(marker in message for marker in invalid_source_markers):
        return LessonGenerationJobStatus.invalid_notebook
    return LessonGenerationJobStatus.failed


def notebook_client_error_status(exc: LessonGenerationClientError) -> LessonGenerationJobStatus:
    return generation_client_error_status(exc)


def notebook_parse_error_status(exc: LessonGenerationParseError) -> LessonGenerationJobStatus:
    if isinstance(exc, GenerationUnanswerableError):
        return LessonGenerationJobStatus.invalid_notebook
    return LessonGenerationJobStatus.invalid_output
