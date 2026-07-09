import uuid
from urllib.parse import quote

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from sqlmodel.ext.asyncio.session import AsyncSession

from ..db import get_session
from ..models import Lesson, User
from ..services.lesson_attachments import read_lesson_attachment_file
from ..services.webapp.lesson_access import get_lesson_access_state
from ..utils.logging_config import logger
from .auth import get_current_user

router = APIRouter()


@router.get("/lessons/{lesson_id}/attachments/{attachment_id}/download")
async def download_lesson_attachment(
    lesson_id: uuid.UUID,
    attachment_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    lesson = await session.get(Lesson, lesson_id)
    if not lesson or lesson.deleted_at or not lesson.is_published:
        raise HTTPException(status_code=404, detail="Lesson not found")

    access = await get_lesson_access_state(
        session=session,
        lesson=lesson,
        current_user=current_user,
        require_membership=False,
    )
    if access.is_locked:
        logger.warning(
            "SECURITY_DENIED: User %s tried to download locked lesson attachment %s for lesson %s. Reason: %s",
            current_user.id,
            attachment_id,
            lesson.id,
            access.lock_reason,
        )
        raise HTTPException(status_code=403, detail=access.lock_reason or "Lesson is locked")

    attachment, content, content_type = await read_lesson_attachment_file(
        session=session,
        attachment_id=attachment_id,
        tenant_id=access.course.tenant_id,
        lesson_id=lesson.id,
    )

    return Response(
        content=content,
        media_type=content_type,
        headers={
            "Content-Disposition": _content_disposition(attachment.filename),
            "Cache-Control": "private, max-age=300",
            "Content-Length": str(len(content)),
        },
    )


def _content_disposition(filename: str) -> str:
    ascii_fallback = "".join(
        char if 32 <= ord(char) < 127 and char not in {'"', "\\", ";"} else "_"
        for char in filename
    ).strip()
    if not ascii_fallback:
        ascii_fallback = "attachment"
    quoted = quote(filename, safe="")
    return f"attachment; filename=\"{ascii_fallback}\"; filename*=UTF-8''{quoted}"
