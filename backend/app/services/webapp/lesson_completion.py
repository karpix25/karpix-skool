import uuid

from fastapi import BackgroundTasks, HTTPException
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from ...config import settings
from ...models import Lesson, LessonProgress, User
from ...services.cache_invalidation import invalidate_lesson_completion_caches
from ...services.gamification import GamificationService
from ...utils.logging_config import logger
from .lesson_access import get_lesson_access_state


async def complete_webapp_lesson(
    *,
    lesson_id: uuid.UUID,
    background_tasks: BackgroundTasks,
    current_user: User,
    session: AsyncSession,
) -> dict:
    lesson = await session.get(Lesson, lesson_id)
    if not lesson or lesson.deleted_at or not lesson.is_published:
        raise HTTPException(status_code=404, detail="Lesson not found")

    access = await get_lesson_access_state(
        session=session,
        lesson=lesson,
        current_user=current_user,
        require_membership=True,
    )
    if access.is_locked:
        logger.warning(
            "SECURITY_DENIED: User %s tried to complete locked lesson %s. Reason: %s",
            current_user.id,
            lesson.id,
            access.lock_reason,
        )
        raise HTTPException(
            status_code=403,
            detail=access.lock_reason or "Lesson is locked.",
        )

    existing_result = await session.exec(
        select(LessonProgress).where(
            LessonProgress.user_id == current_user.id,
            LessonProgress.lesson_id == lesson_id,
        )
    )
    if existing_result.first():
        return {"message": "Already completed", "xp_granted": 0}

    progress = LessonProgress(user_id=current_user.id, lesson_id=lesson_id)
    session.add(progress)

    membership = access.membership
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
        course_id=access.course.id,
        tenant_id=access.course.tenant_id,
        user_id=current_user.id,
    )

    return {
        "message": "Lesson completed!",
        "xp_granted": xp_granted,
        "new_xp": membership.xp if membership else 0,
        "new_level": membership.level if membership else 1,
    }
