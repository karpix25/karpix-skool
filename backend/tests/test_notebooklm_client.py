import pytest
import httpx

from app.services.lesson_generation.notebooklm_client import (
    NotebookLMAuthError,
    NotebookLMClientError,
    NotebookLMMCPClient,
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


@pytest.mark.asyncio
async def test_setup_auth_read_timeout_returns_waiting_state():
    class TimeoutClient(NotebookLMMCPClient):
        def __init__(self):
            super().__init__(base_url="http://notebooklm.test/mcp")
            self.closed_session_id = None

        async def _initialize_session(self, _client):
            return "session-id"

        async def _call_tool(self, _client, _session_id, _name, _arguments):
            raise httpx.ReadTimeout("waiting for login")

        async def _close_session(self, _client, session_id):
            self.closed_session_id = session_id

    client = TimeoutClient()

    result = await client.setup_auth(show_browser=True)

    assert result["status"] == "waiting_for_login"
    assert client.closed_session_id == "session-id"
