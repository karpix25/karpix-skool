from fastapi import APIRouter, Depends, Request
from fastapi.responses import HTMLResponse, JSONResponse
from sqlmodel.ext.asyncio.session import AsyncSession

from ..db import get_session
from ..services.lesson_generation.auth_sessions import (
    NotebookLMAuthSessionError,
    launch_or_check_notebooklm_auth,
    render_notebooklm_auth_error_page,
    render_notebooklm_auth_page,
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
                "expires_at": result.session.expires_at.isoformat(),
                "used_at": result.session.used_at.isoformat() if result.session.used_at else None,
            }
        )
    return HTMLResponse(render_notebooklm_auth_page(result))


def _wants_json(request: Request) -> bool:
    if request.query_params.get("format") == "json":
        return True
    return "application/json" in request.headers.get("accept", "")
