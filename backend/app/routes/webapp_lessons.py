import uuid

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from ..db import get_session
from ..models import Lesson, LessonProgress, Module, User
from ..services.webapp.lesson_completion import complete_webapp_lesson
from ..services.webapp.lesson_access import get_lesson_access_state, lesson_webapp_payload
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
    if not lesson or lesson.deleted_at:
        raise HTTPException(status_code=404, detail="Lesson not found")

    access = await get_lesson_access_state(
        session=session,
        lesson=lesson,
        current_user=current_user,
        require_membership=False,
    )

    progress_result = await session.exec(
        select(LessonProgress).where(
            LessonProgress.user_id == current_user.id,
            LessonProgress.lesson_id == lesson.id,
        )
    )
    is_completed = progress_result.first() is not None

    lesson_data = lesson_webapp_payload(
        lesson,
        is_locked=access.is_locked,
        lock_reason=access.lock_reason,
    )
    if access.is_locked:
        logger.warning(
            "SECURITY_DENIED: User %s tried to access locked lesson %s. Reason: %s",
            current_user.id,
            lesson.id,
            access.lock_reason,
        )

    next_lesson_id = await _get_next_lesson_id(session, access.module.course_id, lesson.id)

    return {
        "lesson": lesson_data,
        "is_completed": is_completed,
        "is_locked": access.is_locked,
        "lock_reason": access.lock_reason,
        "course_id": access.module.course_id,
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
    return await complete_webapp_lesson(
        lesson_id=lesson_uuid,
        background_tasks=background_tasks,
        current_user=current_user,
        session=session,
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
