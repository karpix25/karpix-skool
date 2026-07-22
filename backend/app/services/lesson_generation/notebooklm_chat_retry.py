import asyncio
from typing import Any, Awaitable, Callable

from .provider import LessonGenerationClientError

ChatAsk = Callable[[str, str], Awaitable[Any]]


async def ask_chat_with_retries(
    *,
    ask: ChatAsk,
    notebook_id: str,
    question: str,
    attempts: int,
    backoff_seconds: float,
) -> Any:
    normalized_attempts = max(1, attempts)
    normalized_backoff = max(0.0, backoff_seconds)
    last_error: Exception | None = None

    for attempt in range(1, normalized_attempts + 1):
        try:
            return await ask(notebook_id, question)
        except LessonGenerationClientError:
            raise
        except Exception as exc:
            last_error = exc
            if attempt >= normalized_attempts or not is_retryable_chat_ask_error(exc):
                raise
            if normalized_backoff > 0:
                await asyncio.sleep(normalized_backoff * attempt)

    if last_error:
        raise last_error
    raise LessonGenerationClientError("Google NotebookLM chat request did not return a response")


def is_retryable_chat_ask_error(exc: Exception) -> bool:
    message = str(exc).lower()
    retryable_markers = (
        "incomplete chunked read",
        "peer closed connection",
        "network error",
        "connection reset",
        "connection aborted",
        "broken pipe",
        "timed out",
        "timeout",
    )
    return any(marker in message for marker in retryable_markers)
