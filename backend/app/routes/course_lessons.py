from datetime import datetime
from typing import List
import uuid

from fastapi import APIRouter, Depends
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from ..db import get_session
from ..models import Course, Lesson, Module
from ..schemas.courses import LessonCreate, LessonRead, LessonUpdate
from ..services.cache_invalidation import invalidate_course_write_caches
from ..utils.security import get_managed_lesson, get_managed_module
from .course_media import sync_mux_lesson_status

router = APIRouter()


@router.post("/modules/{module_id}/lessons", response_model=LessonRead)
async def create_lesson(
    lesson_in: LessonCreate,
    module: Module = Depends(get_managed_module),
    session: AsyncSession = Depends(get_session),
):
    from ..utils.logging_config import logger

    logger.info("CREATE LESSON: title=%s, content_len=%s", lesson_in.title, len(lesson_in.content) if lesson_in.content else 0)
    new_lesson = Lesson(
        module_id=module.id,
        title=lesson_in.title,
        video_provider=lesson_in.video_provider,
        video_id=lesson_in.video_id,
        content=lesson_in.content,
        order_index=lesson_in.order_index,
        is_published=lesson_in.is_published,
    )
    session.add(new_lesson)
    await session.commit()
    await session.refresh(new_lesson)
    course = await session.get(Course, module.course_id)
    if course:
        await invalidate_course_write_caches(course_id=course.id, tenant_id=course.tenant_id)
    return new_lesson


@router.get("/modules/{module_id}/lessons", response_model=List[LessonRead])
async def list_lessons(
    module: Module = Depends(get_managed_module),
    session: AsyncSession = Depends(get_session),
):
    stmt = select(Lesson).where(Lesson.module_id == module.id, Lesson.deleted_at == None).order_by(Lesson.order_index)
    result = await session.exec(stmt)
    return result.all()


@router.get("/lessons/{lesson_id}", response_model=LessonRead)
async def get_lesson(
    lesson: Lesson = Depends(get_managed_lesson),
    session: AsyncSession = Depends(get_session),
):
    return await sync_mux_lesson_status(lesson, session)


@router.patch("/lessons/{lesson_id}", response_model=LessonRead)
async def patch_lesson(
    lesson_id: uuid.UUID,
    lesson_in: LessonUpdate,
    lesson: Lesson = Depends(get_managed_lesson),
    session: AsyncSession = Depends(get_session),
):
    from ..utils.logging_config import logger

    logger.info(
        "PATCH LESSON: id=%s, content_len=%s",
        lesson_id,
        len(lesson_in.content) if lesson_in.content else "None" if lesson_in.content is None else 0,
    )

    old_module_id = lesson.module_id
    for field in ("title", "video_provider", "video_id", "content", "order_index", "is_published", "module_id"):
        value = getattr(lesson_in, field)
        if value is not None:
            setattr(lesson, field, value)

    session.add(lesson)
    await session.commit()
    await session.refresh(lesson)
    affected_module_ids = {old_module_id, lesson.module_id}
    for module_id in affected_module_ids:
        module = await session.get(Module, module_id)
        if module:
            course = await session.get(Course, module.course_id)
            if course:
                await invalidate_course_write_caches(course_id=course.id, tenant_id=course.tenant_id)
    return lesson


@router.delete("/lessons/{lesson_id}")
async def delete_lesson(
    lesson: Lesson = Depends(get_managed_lesson),
    session: AsyncSession = Depends(get_session),
):
    module = await session.get(Module, lesson.module_id)
    lesson.deleted_at = datetime.utcnow()
    session.add(lesson)
    await session.commit()
    if module:
        course = await session.get(Course, module.course_id)
        if course:
            await invalidate_course_write_caches(course_id=course.id, tenant_id=course.tenant_id)
    return {"message": "Lesson deleted"}
