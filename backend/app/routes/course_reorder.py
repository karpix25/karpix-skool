from typing import List

from fastapi import APIRouter, Depends
from sqlmodel.ext.asyncio.session import AsyncSession

from ..db import get_session
from ..models import Course, Lesson, Module, User
from ..schemas.courses import BulkReorderItem
from ..services.cache_invalidation import invalidate_course_write_caches
from ..utils.security import ensure_tenant_access
from .auth import get_current_user

router = APIRouter()


@router.post("/reorder/modules")
async def reorder_modules(
    items: List[BulkReorderItem],
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    touched_courses: dict[str, Course] = {}
    for item in items:
        module = await session.get(Module, item.id)
        if module:
            course = await session.get(Course, module.course_id)
            await ensure_tenant_access(course.tenant_id, current_user, session)
            touched_courses[str(course.id)] = course
            module.order_index = item.order_index
            session.add(module)
    await session.commit()
    for course in touched_courses.values():
        await invalidate_course_write_caches(course_id=course.id, tenant_id=course.tenant_id)
    return {"message": "Modules reordered"}


@router.post("/reorder/lessons")
async def reorder_lessons(
    items: List[BulkReorderItem],
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    touched_courses: dict[str, Course] = {}
    for item in items:
        lesson = await session.get(Lesson, item.id)
        if lesson:
            module = await session.get(Module, lesson.module_id)
            course = await session.get(Course, module.course_id)
            await ensure_tenant_access(course.tenant_id, current_user, session)
            touched_courses[str(course.id)] = course
            lesson.order_index = item.order_index
            session.add(lesson)
    await session.commit()
    for course in touched_courses.values():
        await invalidate_course_write_caches(course_id=course.id, tenant_id=course.tenant_id)
    return {"message": "Lessons reordered"}
