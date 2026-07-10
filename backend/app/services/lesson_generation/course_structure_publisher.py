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
    lesson_audits = _lesson_audits_by_position(job.response_json)
    created_lesson_audits = []

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
            lesson = Lesson(
                module_id=module.id,
                title=generated_lesson.title.strip(),
                content=sanitize_lesson_content(generated_lesson.html),
                icon_emoji=generated_lesson.icon_emoji,
                order_index=lesson_offset,
                is_published=False,
                is_vip=course.is_vip,
                unlock_type=UnlockType.immediate,
            )
            session.add(
                lesson
            )
            audit = lesson_audits.get((module_offset, lesson_offset))
            if audit:
                created_lesson_audits.append(
                    {
                        "module_id": str(module.id),
                        "lesson_id": str(lesson.id),
                        "module_index": module_offset,
                        "lesson_index": lesson_offset,
                        "module_title": generated_module.title.strip(),
                        "lesson_title": generated_lesson.title.strip(),
                        "audit": audit,
                    }
                )
            lesson_count += 1

    if created_lesson_audits:
        job.response_json = {
            **(job.response_json or {}),
            "created_lesson_audits": created_lesson_audits,
        }
    job.created_module_count = len(modules)
    job.created_lesson_count = lesson_count
    _preserve_published_draft_methodology(job)
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


def _preserve_published_draft_methodology(job: CourseStructureGenerationJob) -> None:
    request_json = job.request_json if isinstance(job.request_json, dict) else {}
    methodology = {
        key: request_json.get(key)
        for key in ("point_a", "point_b", "global_benefit", "author_experience")
        if request_json.get(key)
    }
    if not methodology:
        return

    response_json = dict(job.response_json or {})
    response_json["draft_publication"] = {
        **response_json.get("draft_publication", {}),
        "methodology": methodology,
    }
    job.response_json = response_json


def _lesson_audits_by_position(response_json: dict | None) -> dict[tuple[int, int], dict]:
    structured_output = (response_json or {}).get("structured_output")
    if not isinstance(structured_output, dict):
        return {}

    audits = structured_output.get("lesson_audits")
    if not isinstance(audits, list):
        return {}

    indexed = {}
    for audit in audits:
        if not isinstance(audit, dict):
            continue
        module_index = audit.get("module_index")
        lesson_index = audit.get("lesson_index")
        if isinstance(module_index, int) and isinstance(lesson_index, int):
            indexed[(module_index, lesson_index)] = audit
    return indexed
