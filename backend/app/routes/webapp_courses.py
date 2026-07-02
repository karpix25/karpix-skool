import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import selectinload
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from ..db import get_session
from ..models import Course, Lesson, LessonProgress, MemberRole, MemberStatus, Module, TenantMember, User
from ..services.webapp.access import (
    check_access,
    ensure_active_membership,
    ensure_active_subscription,
    is_tenant_admin_member,
)
from ..services.webapp.lesson_access import lesson_webapp_payload
from ..utils.cache import cache_route
from ..utils.logging_config import logger
from .auth import get_current_user

router = APIRouter()


@router.get("/courses")
@cache_route(ttl=300)
async def list_student_courses(
    request: Request,
    tenant_id: Optional[uuid.UUID] = None,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    stmt_m = select(TenantMember).where(
        TenantMember.user_id == current_user.id,
        TenantMember.status == MemberStatus.active,
    )
    if tenant_id:
        stmt_m = stmt_m.where(TenantMember.tenant_id == tenant_id)

    res_m = await session.exec(stmt_m)
    memberships = res_m.all()
    logger.info(
        "DEBUG_COURSES: user=%s (id=%s), tenant=%s, found_memberships=%s",
        current_user.username,
        current_user.id,
        tenant_id,
        len(memberships),
    )

    if not memberships:
        return []

    tenant_ids = [membership.tenant_id for membership in memberships]
    membership_by_tenant = {membership.tenant_id: membership for membership in memberships}

    from sqlalchemy import and_, func

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
            Course.tenant_id.in_(tenant_ids),
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

        membership = membership_by_tenant.get(course.tenant_id)
        is_admin = bool(
            membership
            and membership.role in [MemberRole.admin, MemberRole.owner, MemberRole.moderator]
        )
        is_locked, lock_reason = await check_access(
            course,
            membership,
            course.tenant,
            current_user.telegram_id,
            is_admin=is_admin,
        )

        course_data["is_unlocked"] = not is_locked
        course_data["lock_reason"] = lock_reason
        course_data["vip_group_link"] = course.tenant.vip_group_link if course.tenant else None
        output.append(course_data)

    return output


@router.get("/courses/{course_id}")
@cache_route(ttl=600)
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

    await ensure_active_subscription(course.tenant_id, session)
    membership = await ensure_active_membership(current_user.id, course.tenant_id, session)

    progress_result = await session.exec(
        select(LessonProgress).where(LessonProgress.user_id == current_user.id)
    )
    completed_lesson_ids = {str(progress.lesson_id) for progress in progress_result.all()}

    is_admin = await is_tenant_admin_member(course.tenant_id, current_user, session)
    course_locked, course_reason = await check_access(
        course,
        membership,
        course.tenant,
        current_user.telegram_id,
        is_admin=is_admin,
    )

    modules = []
    for module in sorted(course.modules, key=lambda item: item.order_index):
        module_locked, module_reason = await check_access(
            module,
            membership,
            course.tenant,
            current_user.telegram_id,
            is_admin=is_admin,
            parent_locked=course_locked,
            parent_reason=course_reason,
        )

        lessons = []
        for lesson in sorted(module.lessons, key=lambda item: item.order_index):
            lesson_locked, lesson_reason = await check_access(
                lesson,
                membership,
                course.tenant,
                current_user.telegram_id,
                is_admin=is_admin,
                parent_locked=module_locked,
                parent_reason=module_reason,
            )
            lesson_data = lesson_webapp_payload(
                lesson,
                is_locked=lesson_locked,
                lock_reason=lesson_reason,
                is_completed=str(lesson.id) in completed_lesson_ids,
            )
            lessons.append(lesson_data)

        modules.append(
            {
                "id": str(module.id),
                "title": module.title,
                "is_locked": module_locked,
                "lock_reason": module_reason,
                "lessons": lessons,
            }
        )

    total_lessons = sum(len(module["lessons"]) for module in modules)
    completed_lessons = sum(
        1 for module in modules for lesson in module["lessons"] if lesson.get("is_completed")
    )
    progress_percent = int((completed_lessons / total_lessons) * 100) if total_lessons else 0

    logger.info(
        "DEBUG_COURSE_DETAIL: Course='%s' (id=%s), Total=%s, Completed=%s, Progress=%s%%",
        course.title,
        course.id,
        total_lessons,
        completed_lessons,
        progress_percent,
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
            "vip_group_link": course.tenant.vip_group_link if course.tenant else None,
        },
        "modules": modules,
        "total_lessons": total_lessons,
        "completed_lessons": completed_lessons,
        "progress_percent": progress_percent,
    }
