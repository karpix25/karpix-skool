import uuid

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from ..config import settings
from ..db import get_session
from ..models import Course, Lesson, LessonProgress, Module, TenantMember, User
from ..services.gamification import GamificationService
from ..services.cache_invalidation import invalidate_lesson_completion_caches
from ..services.webapp.access import check_access, ensure_active_membership, ensure_active_subscription
from ..utils.logging_config import logger
from .auth import get_current_user

router = APIRouter()


@router.get("/lessons/{lesson_id}")
async def get_lesson_view(
    lesson_id: str,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    lesson_uuid = uuid.UUID(lesson_id)
    lesson = await session.get(Lesson, lesson_uuid)
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")

    progress_result = await session.exec(
        select(LessonProgress).where(
            LessonProgress.user_id == current_user.id,
            LessonProgress.lesson_id == lesson.id,
        )
    )
    is_completed = progress_result.first() is not None

    module_result = await session.exec(
        select(Module).where(Module.id == lesson.module_id, Module.deleted_at == None)
    )
    module = module_result.one_or_none()
    if not module:
        raise HTTPException(status_code=404, detail="Module context not found")

    course = await session.get(Course, module.course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    await ensure_active_subscription(course.tenant_id, session)

    from ..utils.security import is_tenant_admin

    is_admin = await is_tenant_admin(course.tenant_id, current_user, session)
    if not is_admin:
        await ensure_active_membership(current_user.id, course.tenant_id, session)

    membership_result = await session.exec(
        select(TenantMember).where(
            TenantMember.user_id == current_user.id,
            TenantMember.tenant_id == course.tenant_id,
        )
    )
    membership = membership_result.first()

    is_locked, lock_reason = await _lesson_lock_state(
        lesson=lesson,
        module=module,
        course=course,
        membership=membership,
        current_user=current_user,
        is_admin=is_admin,
    )

    lesson_data = lesson.dict()
    if is_locked:
        logger.warning(
            "SECURITY_DENIED: User %s tried to access locked lesson %s. Reason: %s",
            current_user.id,
            lesson.id,
            lock_reason,
        )
        lesson_data["video_id"] = ""
        lesson_data["content"] = "This lesson is locked."

    next_lesson_id = await _get_next_lesson_id(session, module.course_id, lesson.id)

    return {
        "lesson": lesson_data,
        "is_completed": is_completed,
        "is_locked": is_locked,
        "lock_reason": lock_reason,
        "course_id": module.course_id,
        "next_lesson_id": next_lesson_id,
    }


@router.post("/lessons/{lesson_id}/complete")
async def complete_lesson(
    lesson_id: str,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    lesson_uuid = uuid.UUID(lesson_id)
    lesson = await session.get(Lesson, lesson_uuid)
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")

    existing_result = await session.exec(
        select(LessonProgress).where(
            LessonProgress.user_id == current_user.id,
            LessonProgress.lesson_id == lesson_uuid,
        )
    )
    if existing_result.first():
        return {"message": "Already completed", "xp_granted": 0}

    progress = LessonProgress(user_id=current_user.id, lesson_id=lesson_uuid)
    session.add(progress)

    module = await session.get(Module, lesson.module_id)
    course = await session.get(Course, module.course_id)

    await ensure_active_subscription(course.tenant_id, session)
    await ensure_active_membership(current_user.id, course.tenant_id, session)

    membership_result = await session.exec(
        select(TenantMember).where(
            TenantMember.user_id == current_user.id,
            TenantMember.tenant_id == course.tenant_id,
        )
    )
    membership = membership_result.first()

    xp_granted = 10
    if membership:
        leveled_up = await GamificationService.add_xp(
            session,
            membership,
            xp_granted,
            source="lesson",
        )
        if leveled_up:
            background_tasks.add_task(
                GamificationService.notify_level_up_direct,
                settings.BOT_TOKEN,
                current_user.telegram_id,
                membership.level,
            )
        session.add(membership)

    await session.commit()
    await invalidate_lesson_completion_caches(
        course_id=course.id,
        tenant_id=course.tenant_id,
        user_id=current_user.id,
    )

    return {
        "message": "Lesson completed!",
        "xp_granted": xp_granted,
        "new_xp": membership.xp if membership else 0,
        "new_level": membership.level if membership else 1,
    }


async def _lesson_lock_state(
    *,
    lesson: Lesson,
    module: Module,
    course: Course,
    membership: TenantMember | None,
    current_user: User,
    is_admin: bool,
) -> tuple[bool, str | None]:
    is_locked, lock_reason = await check_access(
        lesson,
        membership,
        course.tenant,
        current_user.telegram_id,
        is_admin=is_admin,
    )
    if is_locked:
        return is_locked, lock_reason

    module_locked, module_reason = await check_access(
        module,
        membership,
        course.tenant,
        current_user.telegram_id,
        is_admin=is_admin,
    )
    if module_locked:
        return module_locked, module_reason

    return await check_access(
        course,
        membership,
        course.tenant,
        current_user.telegram_id,
        is_admin=is_admin,
    )


async def _get_next_lesson_id(
    session: AsyncSession,
    course_id: uuid.UUID,
    current_lesson_id: uuid.UUID,
) -> uuid.UUID | None:
    result = await session.exec(
        select(Lesson)
        .join(Module)
        .where(Module.course_id == course_id)
        .order_by(Module.order_index, Lesson.order_index)
    )
    lessons = result.all()
    for index, lesson in enumerate(lessons):
        if lesson.id == current_lesson_id and index + 1 < len(lessons):
            return lessons[index + 1].id
    return None
