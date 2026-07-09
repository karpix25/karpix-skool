from datetime import datetime
import uuid

from botocore.exceptions import ClientError
from fastapi import HTTPException, UploadFile
from sqlalchemy import func
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from ..models import Course, Lesson, LessonAttachment, Module
from ..utils.r2 import storage
from .cache_invalidation import invalidate_lesson_content_caches
from .lesson_attachment_validation import read_validated_lesson_attachment_upload


ATTACHMENT_FOLDER_PREFIX = "lesson-attachments"


async def create_lesson_attachment(
    *,
    session: AsyncSession,
    lesson: Lesson,
    file: UploadFile,
    display_order: int | None = None,
) -> LessonAttachment:
    course = await get_lesson_course_context(session=session, lesson=lesson)
    validated = await read_validated_lesson_attachment_upload(file)
    storage_key = storage.build_key(
        filename=validated.filename,
        folder=build_lesson_attachment_folder(course.tenant_id, lesson.id),
    )

    try:
        await storage.put_file(
            file_content=validated.content,
            key=storage_key,
            content_type=validated.content_type,
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Lesson attachment upload failed") from exc

    attachment = LessonAttachment(
        tenant_id=course.tenant_id,
        lesson_id=lesson.id,
        filename=validated.filename,
        content_type=validated.content_type,
        size_bytes=validated.size_bytes,
        storage_key=storage_key,
        display_order=(
            display_order
            if display_order is not None
            else await get_next_lesson_attachment_order(session=session, lesson_id=lesson.id)
        ),
    )
    session.add(attachment)
    await session.commit()
    await session.refresh(attachment)
    await invalidate_lesson_content_caches(session, lesson.id)
    return attachment


async def list_lesson_attachments(
    *,
    session: AsyncSession,
    lesson: Lesson,
) -> list[LessonAttachment]:
    course = await get_lesson_course_context(session=session, lesson=lesson)
    result = await session.exec(
        select(LessonAttachment)
        .where(
            LessonAttachment.tenant_id == course.tenant_id,
            LessonAttachment.lesson_id == lesson.id,
            LessonAttachment.deleted_at == None,
        )
        .order_by(LessonAttachment.display_order, LessonAttachment.created_at)
    )
    return list(result.all())


async def delete_lesson_attachment(
    *,
    session: AsyncSession,
    lesson: Lesson,
    attachment_id: uuid.UUID,
) -> None:
    course = await get_lesson_course_context(session=session, lesson=lesson)
    attachment = await get_lesson_attachment(
        session=session,
        attachment_id=attachment_id,
        tenant_id=course.tenant_id,
        lesson_id=lesson.id,
    )

    try:
        await storage.delete_file(attachment.storage_key)
    except ClientError as exc:
        if not _is_missing_r2_object(exc):
            raise HTTPException(status_code=500, detail="Lesson attachment delete failed") from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Lesson attachment delete failed") from exc

    attachment.deleted_at = datetime.utcnow()
    session.add(attachment)
    await session.commit()
    await invalidate_lesson_content_caches(session, lesson.id)


async def read_lesson_attachment_file(
    *,
    session: AsyncSession,
    attachment_id: uuid.UUID,
    tenant_id: uuid.UUID,
    lesson_id: uuid.UUID,
) -> tuple[LessonAttachment, bytes, str]:
    attachment = await get_lesson_attachment(
        session=session,
        attachment_id=attachment_id,
        tenant_id=tenant_id,
        lesson_id=lesson_id,
    )
    try:
        content, stored_content_type = await storage.read_file(attachment.storage_key)
    except ClientError as exc:
        if _is_missing_r2_object(exc):
            raise HTTPException(status_code=404, detail="Attachment file not found") from exc
        raise HTTPException(status_code=500, detail="Lesson attachment download failed") from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Lesson attachment download failed") from exc
    return attachment, content, stored_content_type or attachment.content_type


async def get_lesson_attachment(
    *,
    session: AsyncSession,
    attachment_id: uuid.UUID,
    tenant_id: uuid.UUID,
    lesson_id: uuid.UUID,
) -> LessonAttachment:
    attachment = await session.get(LessonAttachment, attachment_id)
    if (
        not attachment
        or attachment.deleted_at is not None
        or attachment.tenant_id != tenant_id
        or attachment.lesson_id != lesson_id
    ):
        raise HTTPException(status_code=404, detail="Lesson attachment not found")
    return attachment


async def get_lesson_course_context(*, session: AsyncSession, lesson: Lesson) -> Course:
    module = await session.get(Module, lesson.module_id)
    if not module or module.deleted_at:
        raise HTTPException(status_code=404, detail="Module context not found")

    course = await session.get(Course, module.course_id)
    if not course or course.deleted_at:
        raise HTTPException(status_code=404, detail="Course context not found")
    return course


async def get_next_lesson_attachment_order(
    *,
    session: AsyncSession,
    lesson_id: uuid.UUID,
) -> int:
    result = await session.exec(
        select(func.max(LessonAttachment.display_order)).where(
            LessonAttachment.lesson_id == lesson_id,
            LessonAttachment.deleted_at == None,
        )
    )
    max_order = result.one_or_none()
    if isinstance(max_order, tuple):
        max_order = max_order[0]
    return 0 if max_order is None else max_order + 1


def build_lesson_attachment_folder(tenant_id: uuid.UUID, lesson_id: uuid.UUID) -> str:
    return f"{ATTACHMENT_FOLDER_PREFIX}/{tenant_id}/{lesson_id}"


def _is_missing_r2_object(exc: ClientError) -> bool:
    error_code = exc.response.get("Error", {}).get("Code")
    return error_code in {"NoSuchKey", "404", "NotFound"}
