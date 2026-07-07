from datetime import datetime

from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from ...models import Course, Lesson, Module, UnlockType
from ...models_generation import CourseStructureGenerationJob, GeneratedCourseModuleDraft
from ...schemas.lesson_generation import GeneratedCourseStructurePayload
from ...services.cache_invalidation import invalidate_course_write_caches
from ...services.content_sanitizer import sanitize_lesson_content


async def create_draft_modules_and_lessons_from_generation(
    *,
    session: AsyncSession,
    job: CourseStructureGenerationJob,
    course: Course,
    generated: GeneratedCourseStructurePayload,
) -> list[Module]:
    start_index = await _next_module_order_index(session, course.id)
    modules: list[Module] = []
    lesson_count = 0

    for module_offset, generated_module in enumerate(generated.modules):
        module = Module(
            course_id=course.id,
            title=generated_module.title.strip(),
            order_index=start_index + module_offset,
            is_vip=course.is_vip,
            unlock_type=UnlockType.immediate,
        )
        session.add(module)
        await session.flush()
        modules.append(module)

        session.add(
            GeneratedCourseModuleDraft(
                job_id=job.id,
                module_id=module.id,
                order_index=module.order_index,
            )
        )

        for lesson_offset, generated_lesson in enumerate(generated_module.lessons):
            session.add(
                Lesson(
                    module_id=module.id,
                    title=generated_lesson.title.strip(),
                    content=sanitize_lesson_content(generated_lesson.html),
                    icon_emoji=generated_lesson.icon_emoji,
                    order_index=lesson_offset,
                    is_published=False,
                    is_vip=course.is_vip,
                    unlock_type=UnlockType.immediate,
                )
            )
            lesson_count += 1

    job.created_module_count = len(modules)
    job.created_lesson_count = lesson_count
    job.completed_at = datetime.utcnow()
    job.updated_at = job.completed_at
    session.add(job)
    await session.commit()

    await invalidate_course_write_caches(course_id=course.id, tenant_id=course.tenant_id)
    return modules


async def _next_module_order_index(session: AsyncSession, course_id) -> int:
    stmt = (
        select(Module)
        .where(Module.course_id == course_id, Module.deleted_at == None)
        .order_by(Module.order_index.desc())
        .limit(1)
    )
    result = await session.exec(stmt)
    last_module = result.first()
    return (last_module.order_index + 1) if last_module else 0
