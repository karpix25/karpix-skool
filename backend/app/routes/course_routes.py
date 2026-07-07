from datetime import datetime
from typing import List
import logging
import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from ..db import get_session
from ..models import Course, Lesson, LessonProgress, Module, Tenant, User
from ..schemas.courses import CourseAnnounce, CourseCreate, CourseDetailRead, CourseRead, CourseUpdate
from ..services.cache_invalidation import invalidate_course_write_caches
from ..services.deep_links import build_course_start_param, build_mini_app_link
from ..services.telegram import broadcast_course_announcement
from ..utils.security import get_managed_course
from ..utils.tenant import get_active_tenant_id
from .auth import get_current_user

router = APIRouter()


async def get_courses_with_progress(courses: List[Course], current_user: User, session: AsyncSession):
    stmt_p = select(LessonProgress).where(LessonProgress.user_id == current_user.id)
    res_p = await session.exec(stmt_p)
    completed_lesson_ids = {p.lesson_id for p in res_p.all()}

    output = []
    for course in courses:
        stmt_l = select(Lesson).join(Module).where(Module.course_id == course.id)
        res_l = await session.exec(stmt_l)
        all_lessons = res_l.all()

        total = len(all_lessons)
        completed = sum(1 for lesson in all_lessons if lesson.id in completed_lesson_ids)

        course_dict = course.dict()
        course_dict["progress_percent"] = int((completed / total) * 100) if total > 0 else 0
        course_dict["lessons_count"] = total
        output.append(course_dict)
    return output


@router.post("/", response_model=CourseRead)
async def create_course(
    course_in: CourseCreate,
    tenant_id: uuid.UUID = Depends(get_active_tenant_id),
    session: AsyncSession = Depends(get_session),
):
    new_course = Course(
        title=course_in.title,
        description=course_in.description,
        cover_url=course_in.cover_url,
        unlock_type=course_in.unlock_type,
        unlock_value=course_in.unlock_value,
        is_published=course_in.is_published,
        is_vip=course_in.is_vip,
        tenant_id=tenant_id,
    )
    session.add(new_course)
    await session.commit()
    await session.refresh(new_course)
    await invalidate_course_write_caches(course_id=new_course.id, tenant_id=tenant_id)
    return new_course


@router.get("/", response_model=List[CourseRead])
async def list_courses(
    current_user: User = Depends(get_current_user),
    tenant_id: uuid.UUID = Depends(get_active_tenant_id),
    session: AsyncSession = Depends(get_session),
):
    stmt = select(Course).where(Course.tenant_id == tenant_id, Course.deleted_at == None)
    result = await session.exec(stmt)
    return await get_courses_with_progress(result.all(), current_user, session)


@router.post("/{course_id}/announce")
async def announce_course(
    course_id: uuid.UUID,
    announce_data: CourseAnnounce,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    course = await get_managed_course(session=session, course_id=course_id, current_user=current_user)
    tenant = await session.get(Tenant, course.tenant_id)
    if not tenant or tenant.deleted_at:
        raise HTTPException(status_code=404, detail="Tenant not found")

    chat_id = tenant.telegram_group_id_vip if course.is_vip else tenant.telegram_group_id
    topic_id = tenant.telegram_topic_id_vip if course.is_vip else tenant.telegram_topic_id

    if not chat_id:
        group_type = "VIP" if course.is_vip else "обычная"
        raise HTTPException(
            status_code=400,
            detail=f"⚠️ Не привязана {group_type} группа Telegram. Пожалуйста, привяжите её в Настройках, прежде чем отправлять анонс.",
        )

    logging.info("ANNOUNCE: Course '%s' (VIP=%s) -> Chat: %s, Topic: %s", course.title, course.is_vip, chat_id, topic_id)
    await broadcast_course_announcement(
        chat_id=chat_id,
        course_title=course.title,
        course_description=course.description or "",
        cover_url=course.cover_url,
        custom_text=announce_data.message,
        setup_code=tenant.setup_code,
        message_thread_id=topic_id,
    )
    return {"status": "success"}


@router.get("/{course_id}", response_model=CourseRead)
async def get_course(course: Course = Depends(get_managed_course)):
    return course


@router.get("/{course_id}/share-link")
async def get_course_share_link(
    course: Course = Depends(get_managed_course),
):
    start_param = build_course_start_param(course.id)
    return {
        "url": build_mini_app_link(start_param),
        "start_param": start_param,
    }


@router.get("/{course_id}/edit", response_model=CourseDetailRead)
async def get_course_editor_data(
    course: Course = Depends(get_managed_course),
    session: AsyncSession = Depends(get_session),
):
    stmt_m = select(Module).where(Module.course_id == course.id, Module.deleted_at == None).order_by(Module.order_index)
    res_m = await session.exec(stmt_m)

    modules_detail = []
    for module in res_m.all():
        stmt_l = select(Lesson).where(Lesson.module_id == module.id, Lesson.deleted_at == None).order_by(Lesson.order_index)
        res_l = await session.exec(stmt_l)
        module_dict = module.dict()
        module_dict["lessons"] = res_l.all()
        modules_detail.append(module_dict)

    return {"course": course, "modules": modules_detail}


@router.patch("/{course_id}", response_model=CourseRead)
async def patch_course(
    course_in: CourseUpdate,
    course: Course = Depends(get_managed_course),
    session: AsyncSession = Depends(get_session),
):
    for field in ("title", "description", "cover_url", "unlock_type", "unlock_value", "is_published", "is_vip"):
        value = getattr(course_in, field)
        if value is not None:
            setattr(course, field, value)

    session.add(course)
    await session.commit()
    await session.refresh(course)
    await invalidate_course_write_caches(course_id=course.id, tenant_id=course.tenant_id)
    return course


@router.delete("/{course_id}")
async def delete_course(
    course: Course = Depends(get_managed_course),
    session: AsyncSession = Depends(get_session),
):
    course.deleted_at = datetime.utcnow()
    session.add(course)
    await session.commit()
    await invalidate_course_write_caches(course_id=course.id, tenant_id=course.tenant_id)
    return {"message": "Course deleted"}


@router.post("/{course_id}/duplicate", response_model=CourseRead)
async def duplicate_course(
    course: Course = Depends(get_managed_course),
    session: AsyncSession = Depends(get_session),
):
    new_course = Course(
        tenant_id=course.tenant_id,
        title=f"{course.title} (Copy)",
        description=course.description,
        cover_url=course.cover_url,
        unlock_type=course.unlock_type,
        unlock_value=course.unlock_value,
        is_vip=course.is_vip,
        is_published=False,
    )
    session.add(new_course)
    await session.flush()

    stmt_m = select(Module).where(Module.course_id == course.id, Module.deleted_at == None).order_by(Module.order_index)
    res_m = await session.exec(stmt_m)
    for module in res_m.all():
        new_module = Module(
            course_id=new_course.id,
            title=module.title,
            unlock_type=module.unlock_type,
            unlock_value=module.unlock_value,
            order_index=module.order_index,
            is_vip=module.is_vip,
        )
        session.add(new_module)
        await session.flush()

        stmt_l = select(Lesson).where(Lesson.module_id == module.id, Lesson.deleted_at == None).order_by(Lesson.order_index)
        res_l = await session.exec(stmt_l)
        for lesson in res_l.all():
            session.add(
                Lesson(
                    module_id=new_module.id,
                    title=lesson.title,
                    video_provider=lesson.video_provider,
                    video_id=lesson.video_id,
                    content=lesson.content,
                    cover_url=lesson.cover_url,
                    icon_emoji=lesson.icon_emoji,
                    order_index=lesson.order_index,
                    is_published=lesson.is_published,
                    is_vip=lesson.is_vip,
                    unlock_type=lesson.unlock_type,
                    unlock_value=lesson.unlock_value,
                    mux_asset_id=lesson.mux_asset_id,
                    mux_playback_id=lesson.mux_playback_id,
                    mux_status=lesson.mux_status,
                )
            )

    await session.commit()
    await session.refresh(new_course)
    await invalidate_course_write_caches(course_id=new_course.id, tenant_id=new_course.tenant_id)
    return new_course
