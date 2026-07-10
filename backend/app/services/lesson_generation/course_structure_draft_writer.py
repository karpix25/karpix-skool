from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from ...models import Course, Lesson, Module, UnlockType
from ...models_generation import (
    CourseStructureGenerationJob,
    CourseStructureLessonTask,
    GeneratedCourseModuleDraft,
)
from ...schemas.lesson_generation import GeneratedLessonPayload
from ...services.content_sanitizer import sanitize_lesson_content


async def persist_lesson_task_draft(
    *,
    session: AsyncSession,
    job: CourseStructureGenerationJob,
    course: Course,
    task: CourseStructureLessonTask,
    module_title: str,
    lesson: GeneratedLessonPayload,
) -> tuple[Module, Lesson, bool]:
    """Persist a generated lesson, preserving drafts edited after generation."""
    existing = await _existing_lesson(session, task)
    if existing is not None:
        module = await session.get(Module, existing.module_id)
        if module is None:
            raise ValueError("Generated lesson module no longer exists")
        if _matches_previous_generated_payload(existing, task.lesson_payload_json):
            existing.title = lesson.title.strip()
            existing.content = sanitize_lesson_content(lesson.html)
            existing.icon_emoji = lesson.icon_emoji
            session.add(existing)
            await session.flush()
            return module, existing, True
        return module, existing, False

    module = await ensure_module_task_draft(
        session=session,
        job=job,
        course=course,
        task=task,
        module_title=module_title,
    )
    draft = Lesson(
        module_id=module.id,
        title=lesson.title.strip(),
        content=sanitize_lesson_content(lesson.html),
        icon_emoji=lesson.icon_emoji,
        order_index=task.lesson_index,
        is_published=False,
        is_vip=course.is_vip,
        unlock_type=UnlockType.immediate,
    )
    session.add(draft)
    await session.flush()
    task.lesson_id = draft.id
    task.module_id = module.id
    session.add(task)
    return module, draft, True


def _matches_previous_generated_payload(
    lesson: Lesson,
    payload: dict | None,
) -> bool:
    if not payload:
        return False
    try:
        previous = GeneratedLessonPayload.model_validate(payload)
    except (TypeError, ValueError):
        return False
    return (
        lesson.title == previous.title.strip()
        and lesson.content == sanitize_lesson_content(previous.html)
        and lesson.icon_emoji == previous.icon_emoji
    )


async def ensure_module_task_draft(
    *,
    session: AsyncSession,
    job: CourseStructureGenerationJob,
    course: Course,
    task: CourseStructureLessonTask,
    module_title: str,
) -> Module:
    existing = await _existing_task_module(session, task)
    if existing is not None:
        task.module_id = existing.id
        session.add(task)
        return existing

    base_order = await _job_module_base_order(session, job, course, task.module_index)
    module = Module(
        course_id=course.id,
        title=module_title.strip(),
        order_index=base_order + task.module_index,
        is_vip=course.is_vip,
        unlock_type=UnlockType.immediate,
    )
    session.add(module)
    await session.flush()
    session.add(
        GeneratedCourseModuleDraft(
            job_id=job.id,
            module_id=module.id,
            order_index=module.order_index,
        )
    )
    task.module_id = module.id
    session.add(task)
    return module


async def _existing_lesson(
    session: AsyncSession,
    task: CourseStructureLessonTask,
) -> Lesson | None:
    if task.lesson_id is None:
        return None
    return await session.get(Lesson, task.lesson_id)


async def _existing_task_module(
    session: AsyncSession,
    task: CourseStructureLessonTask,
) -> Module | None:
    if task.module_id is not None:
        module = await session.get(Module, task.module_id)
        if module is not None:
            return module
    statement = (
        select(CourseStructureLessonTask)
        .where(CourseStructureLessonTask.job_id == task.job_id)
        .where(CourseStructureLessonTask.module_index == task.module_index)
        .where(CourseStructureLessonTask.module_id != None)
        .limit(1)
    )
    sibling = (await session.exec(statement)).first()
    return await session.get(Module, sibling.module_id) if sibling and sibling.module_id else None


async def _job_module_base_order(
    session: AsyncSession,
    job: CourseStructureGenerationJob,
    course: Course,
    module_index: int,
) -> int:
    statement = (
        select(CourseStructureLessonTask, Module)
        .join(Module, CourseStructureLessonTask.module_id == Module.id)
        .where(CourseStructureLessonTask.job_id == job.id)
        .where(CourseStructureLessonTask.module_id != None)
        .limit(1)
    )
    existing = (await session.exec(statement)).first()
    if existing:
        existing_task, module = existing
        return module.order_index - existing_task.module_index

    last_module = (
        await session.exec(
            select(Module)
            .where(Module.course_id == course.id, Module.deleted_at == None)
            .order_by(Module.order_index.desc())
            .limit(1)
        )
    ).first()
    next_order = last_module.order_index + 1 if last_module else 0
    return next_order - module_index
