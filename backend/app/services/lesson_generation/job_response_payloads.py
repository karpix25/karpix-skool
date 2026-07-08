from typing import Any, Optional


def source_parse_failure_response_json(
    *,
    source_response: Optional[dict[str, Any]],
    error: str,
    structured_response: Optional[dict[str, Any]] = None,
    source_brief: Optional[dict[str, Any]] = None,
) -> dict[str, Any]:
    payload: dict[str, Any] = {"parse_error": error}
    if source_response is not None:
        payload["source_answer"] = source_response
        payload["notebook_answer"] = source_response
    if source_brief is not None:
        payload["source_brief"] = source_brief
    if structured_response is not None:
        payload["structured_output"] = structured_response
    return payload


def notebook_parse_failure_response_json(
    *,
    notebook_response: Optional[dict[str, Any]],
    error: str,
) -> dict[str, Any]:
    return source_parse_failure_response_json(source_response=notebook_response, error=error)
