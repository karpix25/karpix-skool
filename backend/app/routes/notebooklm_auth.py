import asyncio
from contextlib import suppress

import httpx
import websockets
from fastapi import APIRouter, Depends, Request, WebSocket
from fastapi.responses import HTMLResponse, JSONResponse, Response
from sqlmodel.ext.asyncio.session import AsyncSession

from ..db import get_session
from ..services.lesson_generation.auth_pages import (
    render_notebooklm_auth_error_page,
    render_notebooklm_auth_page,
)
from ..services.lesson_generation.auth_remote_browser import authorize_notebooklm_remote_browser
from ..services.lesson_generation.auth_sessions import (
    NotebookLMAuthSessionError,
    launch_or_check_notebooklm_auth,
)
from ..services.lesson_generation.remote_browser import (
    build_remote_browser_http_url,
    build_remote_browser_websocket_url,
)

router = APIRouter()


@router.get("/notebooklm/auth/{token}", response_class=HTMLResponse, include_in_schema=False)
@router.get("/notebooklm-auth/{token}", response_class=HTMLResponse, include_in_schema=False)
async def notebooklm_auth_link(
    token: str,
    request: Request,
    session: AsyncSession = Depends(get_session),
):
    try:
        result = await launch_or_check_notebooklm_auth(session=session, token=token)
    except NotebookLMAuthSessionError as exc:
        if _wants_json(request):
            return JSONResponse({"detail": str(exc)}, status_code=exc.status_code)
        return HTMLResponse(render_notebooklm_auth_error_page(str(exc)), status_code=exc.status_code)

    if _wants_json(request):
        return JSONResponse(
            {
                "id": str(result.session.id),
                "status": result.session.status,
                "authenticated": result.authenticated,
                "message": result.message,
                "remote_browser_url": result.remote_browser_url,
                "expires_at": result.session.expires_at.isoformat(),
                "used_at": result.session.used_at.isoformat() if result.session.used_at else None,
            }
        )
    return HTMLResponse(render_notebooklm_auth_page(result))


@router.get("/notebooklm/auth/{token}/browser", include_in_schema=False)
@router.get("/notebooklm/auth/{token}/browser/{path:path}", include_in_schema=False)
async def notebooklm_remote_browser(
    token: str,
    request: Request,
    path: str = "vnc.html",
    session: AsyncSession = Depends(get_session),
):
    try:
        await authorize_notebooklm_remote_browser(session=session, token=token)
        upstream_url = build_remote_browser_http_url(path, request.url.query)
    except (NotebookLMAuthSessionError, ValueError) as exc:
        status_code = exc.status_code if isinstance(exc, NotebookLMAuthSessionError) else 500
        return HTMLResponse(render_notebooklm_auth_error_page(str(exc)), status_code=status_code)

    async with httpx.AsyncClient(timeout=30) as client:
        upstream = await client.get(upstream_url)

    return Response(
        content=upstream.content,
        status_code=upstream.status_code,
        headers=_remote_browser_response_headers(upstream),
        media_type=upstream.headers.get("content-type"),
    )


@router.websocket("/notebooklm/auth/{token}/browser/websockify")
async def notebooklm_remote_browser_websocket(
    websocket: WebSocket,
    token: str,
    session: AsyncSession = Depends(get_session),
):
    try:
        await authorize_notebooklm_remote_browser(session=session, token=token)
        upstream_url = build_remote_browser_websocket_url(str(websocket.url.query))
    except (NotebookLMAuthSessionError, ValueError):
        await websocket.close(code=1008)
        return

    await websocket.accept()
    try:
        async with websockets.connect(upstream_url, max_size=None) as upstream:
            await _proxy_remote_browser_websocket(websocket, upstream)
    except Exception:
        with suppress(RuntimeError):
            await websocket.close(code=1011)


def _wants_json(request: Request) -> bool:
    if request.query_params.get("format") == "json":
        return True
    return "application/json" in request.headers.get("accept", "")


def _remote_browser_response_headers(upstream: httpx.Response) -> dict[str, str]:
    allowed = {"cache-control", "etag", "last-modified"}
    return {key: value for key, value in upstream.headers.items() if key.lower() in allowed}


async def _proxy_remote_browser_websocket(websocket: WebSocket, upstream) -> None:
    to_upstream = asyncio.create_task(_websocket_to_upstream(websocket, upstream))
    to_client = asyncio.create_task(_upstream_to_websocket(upstream, websocket))
    done, pending = await asyncio.wait(
        {to_upstream, to_client},
        return_when=asyncio.FIRST_COMPLETED,
    )
    for task in pending:
        task.cancel()
    for task in pending:
        with suppress(asyncio.CancelledError):
            await task
    for task in done:
        task.result()


async def _websocket_to_upstream(websocket: WebSocket, upstream) -> None:
    while True:
        message = await websocket.receive()
        if message["type"] == "websocket.disconnect":
            await upstream.close()
            return
        if message.get("bytes") is not None:
            await upstream.send(message["bytes"])
        elif message.get("text") is not None:
            await upstream.send(message["text"])


async def _upstream_to_websocket(upstream, websocket: WebSocket) -> None:
    async for message in upstream:
        if isinstance(message, bytes):
            await websocket.send_bytes(message)
        else:
            await websocket.send_text(message)
