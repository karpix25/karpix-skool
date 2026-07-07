from datetime import datetime

from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from ...models import Course, Lesson, Module, UnlockType
from ...models_generation import GeneratedLessonDraft, LessonGenerationJob
from ...schemas.lesson_generation import GeneratedLessonsPayload
from ...services.cache_invalidation import invalidate_course_write_caches
from ...services.content_sanitizer import sanitize_lesson_content


async def create_draft_lessons_from_generation(
    *,
    session: AsyncSession,
    job: LessonGenerationJob,
    module: Module,
    course: Course,
    generated: GeneratedLessonsPayload,
) -> list[Lesson]:
    start_index = await _next_lesson_order_index(session, module.id)
    lessons: list[Lesson] = []

    for offset, generated_lesson in enumerate(generated.lessons):
        lesson = Lesson(
            module_id=module.id,
            title=generated_lesson.title.strip(),
            content=sanitize_lesson_content(generated_lesson.html),
            icon_emoji=generated_lesson.icon_emoji,
            order_index=start_index + offset,
            is_published=False,
            is_vip=module.is_vip,
            unlock_type=UnlockType.immediate,
        )
        session.add(lesson)
        lessons.append(lesson)

    await session.flush()

    for offset, lesson in enumerate(lessons):
        session.add(
            GeneratedLessonDraft(
                job_id=job.id,
                lesson_id=lesson.id,
                order_index=start_index + offset,
            )
        )

    job.created_lesson_count = len(lessons)
    job.completed_at = datetime.utcnow()
    job.updated_at = job.completed_at
    session.add(job)
    await session.commit()

    await invalidate_course_write_caches(course_id=course.id, tenant_id=course.tenant_id)
    return lessons


async def _next_lesson_order_index(session: AsyncSession, module_id) -> int:
    stmt = (
        select(Lesson)
        .where(Lesson.module_id == module_id, Lesson.deleted_at == None)
        .order_by(Lesson.order_index.desc())
        .limit(1)
    )
    result = await session.exec(stmt)
    last_lesson = result.first()
    return (last_lesson.order_index + 1) if last_lesson else 0
