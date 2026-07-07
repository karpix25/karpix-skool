import uuid

from fastapi import BackgroundTasks, HTTPException
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from ...config import settings
from ...models import Lesson, LessonProgress, User
from ...services.cache_invalidation import invalidate_lesson_completion_caches
from ...services.gamification import GamificationService
from ...services.xp_ledger import XPLedgerService
from ...utils.logging_config import logger
from .course_progress import get_lesson_completion_progress
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

    membership = access.membership
    existing_result = await session.exec(
        select(LessonProgress).where(
            LessonProgress.user_id == current_user.id,
            LessonProgress.lesson_id == lesson_id,
        )
    )
    if existing_result.first():
        progress_payload = await _build_completion_progress_payload(
            session=session,
            user_id=current_user.id,
            course_id=access.course.id,
            module_id=access.module.id,
            module_title=access.module.title,
        )
        return {
            "message": "Already completed",
            "xp_granted": 0,
            "new_xp": membership.xp if membership else 0,
            "new_level": membership.level if membership else 1,
            **progress_payload,
        }

    xp_granted = 10
    xp_result = None
    if membership:
        xp_result = await XPLedgerService.award_xp(
            session=session,
            member=membership,
            points=xp_granted,
            source_type="lesson",
            source_id=lesson_id,
        )

        if not xp_result.granted:
            repeated_result = await session.exec(
                select(LessonProgress).where(
                    LessonProgress.user_id == current_user.id,
                    LessonProgress.lesson_id == lesson_id,
                )
            )
            if repeated_result.first():
                progress_payload = await _build_completion_progress_payload(
                    session=session,
                    user_id=current_user.id,
                    course_id=access.course.id,
                    module_id=access.module.id,
                    module_title=access.module.title,
                )
                return {
                    "message": "Already completed",
                    "xp_granted": 0,
                    "new_xp": membership.xp if membership else 0,
                    "new_level": membership.level if membership else 1,
                    **progress_payload,
                }

        if xp_result.leveled_up:
            background_tasks.add_task(
                GamificationService.notify_level_up_direct,
                settings.BOT_TOKEN,
                current_user.telegram_id,
                membership.level,
            )

    progress = LessonProgress(user_id=current_user.id, lesson_id=lesson_id)
    session.add(progress)

    await session.commit()
    await invalidate_lesson_completion_caches(
        course_id=access.course.id,
        tenant_id=access.course.tenant_id,
        user_id=current_user.id,
    )
    progress_payload = await _build_completion_progress_payload(
        session=session,
        user_id=current_user.id,
        course_id=access.course.id,
        module_id=access.module.id,
        module_title=access.module.title,
    )

    return {
        "message": "Lesson completed!",
        "xp_granted": xp_granted if xp_result and xp_result.granted else 0,
        "new_xp": membership.xp if membership else 0,
        "new_level": membership.level if membership else 1,
        **progress_payload,
    }


async def _build_completion_progress_payload(
    *,
    session: AsyncSession,
    user_id: uuid.UUID,
    course_id: uuid.UUID,
    module_id: uuid.UUID,
    module_title: str,
) -> dict:
    progress = await get_lesson_completion_progress(
        session=session,
        user_id=user_id,
        course_id=course_id,
        module_id=module_id,
    )
    return {
        "module_progress": {
            "module_id": str(module_id),
            "title": module_title,
            **progress["module_progress"],
        },
        "course_progress": {
            "course_id": str(course_id),
            **progress["course_progress"],
        },
    }
