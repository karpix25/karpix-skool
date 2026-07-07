from typing import Any, NoReturn, Optional

import httpx

from ...config import settings


class NotebookLMClientError(RuntimeError):
    pass


class NotebookLMAuthError(NotebookLMClientError):
    pass


AUTH_ERROR_MARKERS = (
    "auth",
    "login",
    "log in",
    "sign in",
    "signin",
    "not authenticated",
    "authentication",
    "google account",
    "session expired",
    "unauthorized",
    "not authorized",
    "please authenticate",
)


class NotebookLMMCPClient:
    def __init__(self, base_url: Optional[str] = None, timeout_seconds: Optional[int] = None):
        raw_url = base_url or settings.NOTEBOOKLM_MCP_URL
        self.base_url = raw_url.rstrip("/") if raw_url else ""
        self.timeout_seconds = timeout_seconds or settings.NOTEBOOKLM_ANSWER_TIMEOUT_SECONDS

    async def ask_lessons(self, *, notebook_url: str, question: str) -> dict[str, Any]:
        if not self.base_url:
            raise NotebookLMClientError("NOTEBOOKLM_MCP_URL is not configured")

        async with httpx.AsyncClient(timeout=self.timeout_seconds) as client:
            session_id = await self._initialize_session(client)
            result = await self._call_tool(
                client,
                session_id,
                "ask_question",
                {
                    "notebook_url": notebook_url,
                    "question": question,
                    "source_format": "json",
                },
            )

        data = _unwrap_tool_data(result)
        answer = data.get("answer")
        if not isinstance(answer, str) or not answer.strip():
            raise NotebookLMClientError("NotebookLM response did not include an answer")
        return data

    async def health(self) -> dict[str, Any]:
        if not self.base_url:
            raise NotebookLMClientError("NOTEBOOKLM_MCP_URL is not configured")

        async with httpx.AsyncClient(timeout=30) as client:
            session_id = await self._initialize_session(client)
            result = await self._call_tool(client, session_id, "get_health", {})
        return _unwrap_tool_data(result)

    async def setup_auth(self, *, show_browser: bool = True) -> dict[str, Any]:
        if not self.base_url:
            raise NotebookLMClientError("NOTEBOOKLM_MCP_URL is not configured")

        async with httpx.AsyncClient(timeout=settings.NOTEBOOKLM_AUTH_SETUP_TIMEOUT_SECONDS) as client:
            session_id = await self._initialize_session(client)
            result = await self._call_tool(
                client,
                session_id,
                "setup_auth",
                {"show_browser": show_browser},
            )
        return _unwrap_tool_data(result)

    async def _initialize_session(self, client: httpx.AsyncClient) -> str:
        response = await client.post(
            self.base_url,
            json={
                "jsonrpc": "2.0",
                "id": 1,
                "method": "initialize",
                "params": {
                    "protocolVersion": "2025-03-26",
                    "capabilities": {},
                    "clientInfo": {"name": "karpix-skool", "version": "1.0.0"},
                },
            },
        )
        _raise_for_mcp_response(response)
        session_id = response.headers.get("Mcp-Session-Id")
        if not session_id:
            raise NotebookLMClientError("NotebookLM MCP did not return a session id")

        await client.post(
            self.base_url,
            headers={"Mcp-Session-Id": session_id},
            json={
                "jsonrpc": "2.0",
                "method": "notifications/initialized",
                "params": {},
            },
        )
        return session_id

    async def _call_tool(
        self,
        client: httpx.AsyncClient,
        session_id: str,
        name: str,
        arguments: dict[str, Any],
    ) -> dict[str, Any]:
        response = await client.post(
            self.base_url,
            headers={"Mcp-Session-Id": session_id},
            json={
                "jsonrpc": "2.0",
                "id": 2,
                "method": "tools/call",
                "params": {"name": name, "arguments": arguments},
            },
        )
        payload = _raise_for_mcp_response(response)
        if "error" in payload:
            message = str(payload["error"].get("message") if isinstance(payload["error"], dict) else payload["error"])
            _raise_notebooklm_error(message)
        result = payload.get("result")
        if not isinstance(result, dict):
            raise NotebookLMClientError("NotebookLM MCP returned an invalid tool result")
        return result


def _raise_for_mcp_response(response: httpx.Response) -> dict[str, Any]:
    try:
        response.raise_for_status()
    except httpx.HTTPStatusError as exc:
        if response.status_code in (401, 403):
            raise NotebookLMAuthError(f"NotebookLM MCP HTTP {response.status_code} requires authentication") from exc
        raise NotebookLMClientError(f"NotebookLM MCP HTTP {response.status_code}") from exc

    payload = response.json()
    if not isinstance(payload, dict):
        raise NotebookLMClientError("NotebookLM MCP returned non-object JSON")
    return payload


def _unwrap_tool_data(result: dict[str, Any]) -> dict[str, Any]:
    if result.get("isError"):
        _raise_notebooklm_error(
            _extract_tool_error_message(result),
            fallback="NotebookLM MCP tool returned an error",
        )

    if isinstance(result.get("structuredContent"), dict):
        return _unwrap_success_envelope(result["structuredContent"])

    for item in result.get("content", []):
        if not isinstance(item, dict) or item.get("type") != "text":
            continue
        text = item.get("text")
        if not isinstance(text, str):
            continue
        try:
            payload = httpx.Response(200, content=text).json()
        except Exception:
            return {"answer": text}
        if isinstance(payload, dict):
            return _unwrap_success_envelope(payload)
        return {"answer": text}

    raise NotebookLMClientError("NotebookLM MCP result did not include text content")


def _unwrap_success_envelope(payload: dict[str, Any]) -> dict[str, Any]:
    if payload.get("success") is False:
        message = str(payload.get("error") or payload.get("message") or "NotebookLM MCP tool failed")
        _raise_notebooklm_error(message)

    data = payload.get("data", payload)
    if not isinstance(data, dict):
        raise NotebookLMClientError("NotebookLM MCP data payload must be an object")
    return data


def _raise_notebooklm_error(message: str, *, fallback: str = "NotebookLM MCP tool failed") -> NoReturn:
    clean_message = message.strip() or fallback
    if _looks_like_auth_error(clean_message):
        raise NotebookLMAuthError(clean_message)
    raise NotebookLMClientError(clean_message)


def _looks_like_auth_error(message: str) -> bool:
    lowered = message.lower()
    return any(marker in lowered for marker in AUTH_ERROR_MARKERS)


def _extract_tool_error_message(result: dict[str, Any]) -> str:
    parts: list[str] = []
    structured = result.get("structuredContent")
    if isinstance(structured, dict):
        _append_text_value(parts, structured.get("error"))
        _append_text_value(parts, structured.get("message"))
        _append_text_value(parts, structured.get("detail"))

    for item in result.get("content", []):
        if not isinstance(item, dict):
            continue
        _append_text_value(parts, item.get("text"))

    return " ".join(part for part in parts if part)


def _append_text_value(parts: list[str], value: Any) -> None:
    if isinstance(value, str):
        text = value.strip()
    elif value is None:
        return
    else:
        text = str(value).strip()
    if text:
        parts.append(text)
