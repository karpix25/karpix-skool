from fastapi import APIRouter, Depends, HTTPException
from sqlmodel.ext.asyncio.session import AsyncSession

from ..db import get_session
from ..models import Course, Lesson, Module, User
from ..schemas.courses import BulkReorderRequest
from ..services.cache_invalidation import invalidate_course_write_caches
from ..utils.security import ensure_tenant_access
from .auth import get_current_user

router = APIRouter()


@router.post("/reorder/modules")
async def reorder_modules(
    payload: BulkReorderRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    touched_courses: dict[str, Course] = {}
    for item in payload.items:
        module = await session.get(Module, item.id)
        if module:
            course = await session.get(Course, module.course_id)
            await ensure_tenant_access(
                course.tenant_id,
                current_user,
                session,
                require_write=True,
            )
            touched_courses[str(course.id)] = course
            module.order_index = item.order_index
            session.add(module)
    await session.commit()
    for course in touched_courses.values():
        await invalidate_course_write_caches(course_id=course.id, tenant_id=course.tenant_id)
    return {"message": "Modules reordered"}


@router.post("/reorder/lessons")
async def reorder_lessons(
    payload: BulkReorderRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    touched_courses: dict[str, Course] = {}
    for item in payload.items:
        lesson = await session.get(Lesson, item.id)
        if lesson:
            source_module = await session.get(Module, lesson.module_id)
            source_course = await session.get(Course, source_module.course_id)
            await ensure_tenant_access(
                source_course.tenant_id,
                current_user,
                session,
                require_write=True,
            )

            target_module = source_module
            if item.module_id is not None and item.module_id != source_module.id:
                target_module = await session.get(Module, item.module_id)
                if not target_module or target_module.deleted_at:
                    raise HTTPException(status_code=404, detail="Target module not found")
                target_course = await session.get(Course, target_module.course_id)
                if not target_course or target_course.deleted_at:
                    raise HTTPException(status_code=404, detail="Target course not found")
                if target_course.id != source_course.id:
                    raise HTTPException(status_code=400, detail="Cannot reorder lessons across courses")
                lesson.module_id = target_module.id

            touched_courses[str(source_course.id)] = source_course
            lesson.order_index = item.order_index
            session.add(lesson)
    await session.commit()
    for course in touched_courses.values():
        await invalidate_course_write_caches(course_id=course.id, tenant_id=course.tenant_id)
    return {"message": "Lessons reordered"}
