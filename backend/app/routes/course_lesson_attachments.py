import uuid

from fastapi import APIRouter, Depends, File, Form, UploadFile, status
from fastapi.responses import Response
from sqlmodel.ext.asyncio.session import AsyncSession

from ..db import get_session
from ..models import Lesson
from ..schemas.lesson_attachments import LessonAttachmentRead
from ..services.lesson_attachments import (
    create_lesson_attachment,
    delete_lesson_attachment,
    list_lesson_attachments,
)
from ..utils.security import get_managed_lesson

router = APIRouter()


@router.post(
    "/lessons/{lesson_id}/attachments",
    response_model=LessonAttachmentRead,
    status_code=status.HTTP_201_CREATED,
)
async def upload_lesson_attachment(
    file: UploadFile = File(...),
    display_order: int | None = Form(default=None),
    lesson: Lesson = Depends(get_managed_lesson),
    session: AsyncSession = Depends(get_session),
):
    return await create_lesson_attachment(
        session=session,
        lesson=lesson,
        file=file,
        display_order=display_order,
    )


@router.get("/lessons/{lesson_id}/attachments", response_model=list[LessonAttachmentRead])
async def list_admin_lesson_attachments(
    lesson: Lesson = Depends(get_managed_lesson),
    session: AsyncSession = Depends(get_session),
):
    return await list_lesson_attachments(session=session, lesson=lesson)


@router.delete(
    "/lessons/{lesson_id}/attachments/{attachment_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_admin_lesson_attachment(
    attachment_id: uuid.UUID,
    lesson: Lesson = Depends(get_managed_lesson),
    session: AsyncSession = Depends(get_session),
):
    await delete_lesson_attachment(
        session=session,
        lesson=lesson,
        attachment_id=attachment_id,
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)
