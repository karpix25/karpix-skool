import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import and_, func
from sqlalchemy.orm import selectinload
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from ..db import get_session
from ..models import Course, Lesson, LessonProgress, MemberRole, Module, User
from ..services.webapp.access import check_access
from ..services.webapp.course_access_context import (
    build_course_detail_access_context,
    build_course_list_access_context,
)
from ..services.webapp.course_progress import (
    build_progress_payload,
    get_completed_lesson_ids_for_course,
    get_course_progress_detail,
)
from ..services.webapp.lesson_access import lesson_webapp_payload
from ..services.tenant_links import safe_vip_group_link_for_response
from ..utils.logging_config import logger
from .auth import get_current_user

router = APIRouter()


@router.get("/courses")
async def list_student_courses(
    request: Request,
    tenant_id: Optional[uuid.UUID] = None,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    access_context = await build_course_list_access_context(
        session=session,
        request=request,
        current_user=current_user,
        tenant_id=tenant_id,
    )
    logger.info(
        "DEBUG_COURSES: user=%s (id=%s), tenant=%s, tenant_count=%s, super_preview=%s",
        current_user.username,
        current_user.id,
        tenant_id,
        len(access_context.tenant_ids),
        access_context.is_super_admin_preview,
    )

    if not access_context.tenant_ids:
        return []

    stmt = (
        select(
            Course,
            func.count(Lesson.id).label("total_lessons"),
            func.count(LessonProgress.id).label("completed_lessons"),
        )
        .outerjoin(Module, and_(Module.course_id == Course.id, Module.deleted_at == None))
        .outerjoin(
            Lesson,
            and_(
                Lesson.module_id == Module.id,
                Lesson.deleted_at == None,
                Lesson.is_published == True,
            ),
        )
        .outerjoin(
            LessonProgress,
            and_(
                LessonProgress.lesson_id == Lesson.id,
                LessonProgress.user_id == current_user.id,
            ),
        )
        .where(
            Course.is_published == True,
            Course.tenant_id.in_(access_context.tenant_ids),
            Course.deleted_at == None,
        )
        .options(selectinload(Course.tenant))
        .group_by(Course.id)
    )

    results = await session.exec(stmt)
    output = []
    for course, total, completed in results.all():
        course_data = course.dict()
        course_data["total_lessons"] = total
        course_data["completed_lessons"] = completed
        course_data["progress_percent"] = int((completed / total) * 100) if total > 0 else 0

        membership = access_context.membership_by_tenant.get(course.tenant_id)
        tenant = access_context.active_tenants.get(course.tenant_id)
        is_admin = bool(
            access_context.is_super_admin_preview
            or (
                membership
                and membership.role in [MemberRole.admin, MemberRole.owner]
            )
        )
        is_locked, lock_reason = await check_access(
            course,
            membership,
            tenant or course.tenant,
            current_user.telegram_id,
            is_admin=is_admin,
        )

        course_data["is_unlocked"] = not is_locked
        course_data["lock_reason"] = lock_reason
        course_data["vip_group_link"] = safe_vip_group_link_for_response(
            tenant.vip_group_link if tenant else None
        )
        output.append(course_data)

    return output


@router.get("/courses/{course_id}")
async def get_course_detail(
    course_id: str,
    request: Request,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    course_uuid = uuid.UUID(course_id)
    stmt = (
        select(Course)
        .where(
            Course.id == course_uuid,
            Course.is_published == True,
            Course.deleted_at == None,
        )
        .options(
            selectinload(Course.tenant),
            selectinload(Course.modules.and_(Module.deleted_at == None)).selectinload(
                Module.lessons.and_(Lesson.deleted_at == None, Lesson.is_published == True)
            ),
        )
    )
    result = await session.exec(stmt)
    course = result.one_or_none()

    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    access_context = await build_course_detail_access_context(
        session=session,
        request=request,
        current_user=current_user,
        course=course,
    )

    completed_lesson_ids = await get_completed_lesson_ids_for_course(
        session=session,
        user_id=current_user.id,
        course_id=course.id,
    )
    progress_detail = await get_course_progress_detail(
        session=session,
        user_id=current_user.id,
        course_id=course.id,
    )

    course_locked, course_reason = await check_access(
        course,
        access_context.membership,
        access_context.tenant,
        current_user.telegram_id,
        is_admin=access_context.is_admin,
    )

    modules = []
    for module in sorted(course.modules, key=lambda item: item.order_index):
        module_locked, module_reason = await check_access(
            module,
            access_context.membership,
            access_context.tenant,
            current_user.telegram_id,
            is_admin=access_context.is_admin,
            parent_locked=course_locked,
            parent_reason=course_reason,
        )

        lessons = []
        for lesson in sorted(module.lessons, key=lambda item: item.order_index):
            lesson_locked, lesson_reason = await check_access(
                lesson,
                access_context.membership,
                access_context.tenant,
                current_user.telegram_id,
                is_admin=access_context.is_admin,
                parent_locked=module_locked,
                parent_reason=module_reason,
            )
            lesson_data = lesson_webapp_payload(
                lesson,
                is_locked=lesson_locked,
                lock_reason=lesson_reason,
                is_completed=lesson.id in completed_lesson_ids,
            )
            lessons.append(lesson_data)

        module_progress = progress_detail.module_progress_by_id.get(
            module.id,
            build_progress_payload(0, 0),
        )
        modules.append(
            {
                "id": str(module.id),
                "title": module.title,
                "is_locked": module_locked,
                "lock_reason": module_reason,
                "total_lessons": module_progress["total_lessons"],
                "completed_lessons": module_progress["completed_lessons"],
                "progress_percent": module_progress["progress_percent"],
                "lessons": lessons,
            }
        )

    course_progress = progress_detail.course_progress

    logger.info(
        "DEBUG_COURSE_DETAIL: Course='%s' (id=%s), Total=%s, Completed=%s, Progress=%s%%",
        course.title,
        course.id,
        course_progress["total_lessons"],
        course_progress["completed_lessons"],
        course_progress["progress_percent"],
    )

    return {
        "course": {
            "id": str(course.id),
            "title": course.title,
            "description": course.description,
            "cover_url": course.cover_url,
            "is_vip": course.is_vip,
            "unlock_type": course.unlock_type,
            "unlock_value": course.unlock_value,
            "is_unlocked": not course_locked,
            "lock_reason": course_reason,
            "vip_group_link": safe_vip_group_link_for_response(access_context.tenant.vip_group_link),
        },
        "modules": modules,
        "total_lessons": course_progress["total_lessons"],
        "completed_lessons": course_progress["completed_lessons"],
        "progress_percent": course_progress["progress_percent"],
    }
