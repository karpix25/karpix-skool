import uuid
from dataclasses import dataclass

from sqlalchemy import and_, func
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from ...models import Lesson, LessonProgress, Module


ProgressPayload = dict[str, int]


@dataclass(frozen=True)
class CourseProgressDetail:
    course_progress: ProgressPayload
    module_progress_by_id: dict[uuid.UUID, ProgressPayload]


def build_progress_payload(total_lessons: int, completed_lessons: int) -> ProgressPayload:
    progress_percent = int((completed_lessons / total_lessons) * 100) if total_lessons else 0
    return {
        "total_lessons": total_lessons,
        "completed_lessons": completed_lessons,
        "progress_percent": progress_percent,
    }


async def get_course_progress_detail(
    *,
    session: AsyncSession,
    user_id: uuid.UUID,
    course_id: uuid.UUID,
) -> CourseProgressDetail:
    module_progress_by_id = await get_course_modules_progress(
        session=session,
        user_id=user_id,
        course_id=course_id,
    )
    total_lessons = sum(item["total_lessons"] for item in module_progress_by_id.values())
    completed_lessons = sum(item["completed_lessons"] for item in module_progress_by_id.values())
    return CourseProgressDetail(
        course_progress=build_progress_payload(total_lessons, completed_lessons),
        module_progress_by_id=module_progress_by_id,
    )


async def get_course_modules_progress(
    *,
    session: AsyncSession,
    user_id: uuid.UUID,
    course_id: uuid.UUID,
) -> dict[uuid.UUID, ProgressPayload]:
    result = await session.exec(
        select(
            Module.id,
            func.count(Lesson.id).label("total_lessons"),
            func.count(LessonProgress.id).label("completed_lessons"),
        )
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
                LessonProgress.user_id == user_id,
            ),
        )
        .where(
            Module.course_id == course_id,
            Module.deleted_at == None,
        )
        .group_by(Module.id)
    )
    return {
        module_id: build_progress_payload(
            total_lessons=int(total_lessons or 0),
            completed_lessons=int(completed_lessons or 0),
        )
        for module_id, total_lessons, completed_lessons in result.all()
    }


async def get_lesson_completion_progress(
    *,
    session: AsyncSession,
    user_id: uuid.UUID,
    course_id: uuid.UUID,
    module_id: uuid.UUID,
) -> dict[str, ProgressPayload]:
    detail = await get_course_progress_detail(
        session=session,
        user_id=user_id,
        course_id=course_id,
    )
    return {
        "module_progress": detail.module_progress_by_id.get(
            module_id,
            build_progress_payload(0, 0),
        ),
        "course_progress": detail.course_progress,
    }


async def get_completed_lesson_ids_for_course(
    *,
    session: AsyncSession,
    user_id: uuid.UUID,
    course_id: uuid.UUID,
) -> set[uuid.UUID]:
    result = await session.exec(
        select(LessonProgress.lesson_id)
        .join(Lesson, LessonProgress.lesson_id == Lesson.id)
        .join(Module, Lesson.module_id == Module.id)
        .where(
            LessonProgress.user_id == user_id,
            Module.course_id == course_id,
            Module.deleted_at == None,
            Lesson.deleted_at == None,
            Lesson.is_published == True,
        )
    )
    return set(result.all())
