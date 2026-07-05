from datetime import datetime
from typing import List
import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from ..db import get_session
from ..models import Course, Lesson, Module
from ..schemas.courses import LessonCreate, LessonRead, LessonUpdate
from ..services.cache_invalidation import invalidate_course_write_caches
from ..services.content_sanitizer import sanitize_lesson_content
from ..services.course_notifications import notify_lesson_published
from ..services.deep_links import build_lesson_start_param, build_mini_app_link
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
        content=sanitize_lesson_content(lesson_in.content),
        cover_url=lesson_in.cover_url,
        icon_emoji=lesson_in.icon_emoji,
        order_index=lesson_in.order_index,
        is_published=lesson_in.is_published,
        is_vip=lesson_in.is_vip,
        unlock_type=lesson_in.unlock_type,
        unlock_value=lesson_in.unlock_value,
    )
    session.add(new_lesson)
    await session.commit()
    await session.refresh(new_lesson)
    course = await session.get(Course, module.course_id)
    if course:
        await invalidate_course_write_caches(course_id=course.id, tenant_id=course.tenant_id)
    if new_lesson.is_published:
        await notify_lesson_published(session=session, lesson=new_lesson)
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


@router.get("/lessons/{lesson_id}/share-link")
async def get_lesson_share_link(
    lesson: Lesson = Depends(get_managed_lesson),
):
    start_param = build_lesson_start_param(lesson.id)
    return {
        "url": build_mini_app_link(start_param),
        "start_param": start_param,
    }


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
    old_module = await session.get(Module, old_module_id)
    if not old_module:
        raise HTTPException(status_code=404, detail="Module context not found")
    old_course = await session.get(Course, old_module.course_id)
    if not old_course:
        raise HTTPException(status_code=404, detail="Course context not found")
    was_published = lesson.is_published

    if lesson_in.module_id is not None and lesson_in.module_id != old_module_id:
        target_module = await session.get(Module, lesson_in.module_id)
        if not target_module or target_module.deleted_at:
            raise HTTPException(status_code=404, detail="Target module not found")
        target_course = await session.get(Course, target_module.course_id)
        if not target_course or target_course.deleted_at:
            raise HTTPException(status_code=404, detail="Target course not found")
        if target_course.tenant_id != old_course.tenant_id:
            raise HTTPException(status_code=403, detail="Cannot move lesson across schools")

    for field in (
        "title",
        "video_provider",
        "video_id",
        "content",
        "cover_url",
        "icon_emoji",
        "order_index",
        "is_published",
        "is_vip",
        "unlock_type",
        "unlock_value",
        "module_id",
        "mux_asset_id",
        "mux_playback_id",
        "mux_status",
    ):
        value = getattr(lesson_in, field)
        if value is not None:
            if field == "content":
                value = sanitize_lesson_content(value)
            setattr(lesson, field, value)
    became_published = not was_published and lesson.is_published

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
    if became_published:
        await notify_lesson_published(session=session, lesson=lesson)
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
