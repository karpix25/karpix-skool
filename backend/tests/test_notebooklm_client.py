import pytest
import httpx

from app.services.lesson_generation.notebooklm_client import (
    NotebookLMAuthError,
    NotebookLMClientError,
    _raise_for_mcp_response,
    _unwrap_tool_data,
)


def test_unwrap_tool_data_treats_mcp_is_error_auth_text_as_reauth():
    with pytest.raises(NotebookLMAuthError) as exc_info:
        _unwrap_tool_data(
            {
                "isError": True,
                "content": [
                    {
                        "type": "text",
                        "text": "Google account is not authenticated. Please sign in.",
                    }
                ],
            }
        )

    assert "not authenticated" in str(exc_info.value)


def test_unwrap_tool_data_treats_structured_auth_error_as_reauth():
    with pytest.raises(NotebookLMAuthError):
        _unwrap_tool_data(
            {
                "isError": True,
                "structuredContent": {
                    "message": "Session expired. Please authenticate NotebookLM again.",
                },
            }
        )


def test_unwrap_tool_data_treats_success_false_auth_payload_as_reauth():
    with pytest.raises(NotebookLMAuthError):
        _unwrap_tool_data(
            {
                "content": [
                    {
                        "type": "text",
                        "text": '{"success": false, "error": "Unauthorized: please log in to Google"}',
                    }
                ],
            }
        )


def test_unwrap_tool_data_keeps_non_auth_tool_errors_generic():
    with pytest.raises(NotebookLMClientError) as exc_info:
        _unwrap_tool_data(
            {
                "isError": True,
                "content": [{"type": "text", "text": "NotebookLM rate limit exceeded"}],
            }
        )

    assert type(exc_info.value) is NotebookLMClientError
    assert "rate limit" in str(exc_info.value)


def test_raise_for_mcp_response_treats_unauthorized_http_as_reauth():
    response = httpx.Response(401, request=httpx.Request("POST", "http://notebooklm.test/mcp"))

    with pytest.raises(NotebookLMAuthError):
        _raise_for_mcp_response(response)


def test_raise_for_mcp_response_decodes_streamable_http_sse():
    response = httpx.Response(
        200,
        headers={"content-type": "text/event-stream"},
        text='event: message\ndata: {"result": {"ok": true}, "jsonrpc": "2.0", "id": 1}\n\n',
        request=httpx.Request("POST", "http://notebooklm.test/mcp"),
    )

    assert _raise_for_mcp_response(response) == {"result": {"ok": True}, "jsonrpc": "2.0", "id": 1}
