import uuid

from sqlmodel.ext.asyncio.session import AsyncSession

from ...models import Course, CourseUnlockType, Lesson, Module, UnlockType
from ...schemas.agent import AgentModuleDraftCreate
from ..content_sanitizer import sanitize_lesson_content


async def create_unpublished_course_draft(
    *,
    session: AsyncSession,
    tenant_id: uuid.UUID,
    title: str,
    description: str | None,
    cover_url: str | None,
    is_vip: bool,
) -> Course:
    course = Course(
        tenant_id=tenant_id,
        title=title,
        description=description,
        cover_url=cover_url,
        unlock_type=CourseUnlockType.open,
        is_published=False,
        is_vip=is_vip,
    )
    session.add(course)
    await session.flush()
    return course


async def create_unpublished_module_drafts(
    *,
    session: AsyncSession,
    course: Course,
    modules: list[AgentModuleDraftCreate],
) -> list[tuple[Module, list[Lesson]]]:
    created: list[tuple[Module, list[Lesson]]] = []
    for module_index, module_input in enumerate(modules):
        module = Module(
            course_id=course.id,
            title=module_input.title,
            order_index=module_index,
            is_vip=course.is_vip,
            unlock_type=UnlockType.immediate,
        )
        session.add(module)
        await session.flush()

        lessons: list[Lesson] = []
        for lesson_index, lesson_input in enumerate(module_input.lessons):
            lesson = Lesson(
                module_id=module.id,
                title=lesson_input.title,
                content=sanitize_lesson_content(lesson_input.content),
                cover_url=lesson_input.cover_url,
                icon_emoji=lesson_input.icon_emoji,
                order_index=lesson_index,
                is_published=False,
                is_vip=course.is_vip,
                unlock_type=UnlockType.immediate,
            )
            session.add(lesson)
            lessons.append(lesson)
        await session.flush()
        created.append((module, lessons))
    return created
