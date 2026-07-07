from typing import Optional
import uuid

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel.ext.asyncio.session import AsyncSession

from ..db import get_session
from ..models import User
from ..models_generation import LessonGenerationJob
from ..services.lesson_generation.auth_sessions import send_notebooklm_auth_link_to_super_admin
from .auth import get_super_user

router = APIRouter(tags=["super_admin"])


class NotebookLMAuthLinkRequest(BaseModel):
    job_id: Optional[uuid.UUID] = None
    reason: Optional[str] = None


@router.post("/notebooklm/auth-link")
async def send_notebooklm_auth_link(
    request: NotebookLMAuthLinkRequest,
    super_user: User = Depends(get_super_user),
    session: AsyncSession = Depends(get_session),
):
    job = None
    if request.job_id:
        job = await session.get(LessonGenerationJob, request.job_id)
        if not job:
            raise HTTPException(status_code=404, detail="Lesson generation job not found")

    record = await send_notebooklm_auth_link_to_super_admin(
        session=session,
        requested_by_user_id=super_user.id,
        job_id=job.id if job else None,
        reason=request.reason or "Manual NotebookLM auth request",
    )
    if not record:
        raise HTTPException(status_code=400, detail="SUPER_ADMIN_ID is not configured")
    return {"id": record.id, "status": record.status, "expires_at": record.expires_at}
