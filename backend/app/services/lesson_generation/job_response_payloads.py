from typing import Any, Optional


def notebook_parse_failure_response_json(
    *,
    notebook_response: Optional[dict[str, Any]],
    error: str,
) -> dict[str, Any]:
    payload: dict[str, Any] = {"parse_error": error}
    if notebook_response is not None:
        payload["notebook_answer"] = notebook_response
    return payload
