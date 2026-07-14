from fastapi import HTTPException, Depends, Request
from sqlmodel.ext.asyncio.session import AsyncSession
import uuid

from ..db import get_session
from ..models import User, Course, Module, Lesson
from ..routes.auth import get_current_user
from ..services.tenant_access import (
    TENANT_MANAGEMENT_ROLES,
    ensure_tenant_access,
    is_tenant_admin,
)

__all__ = [
    "TENANT_MANAGEMENT_ROLES",
    "ensure_tenant_access",
    "get_managed_course",
    "get_managed_lesson",
    "get_managed_module",
    "is_tenant_admin",
]


async def get_managed_course(
    course_id: uuid.UUID,
    request: Request = None,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
) -> Course:
    """
    Dependency to fetch a course and verify management access.
    """
    course = await session.get(Course, course_id)
    if not course or course.deleted_at:
        raise HTTPException(status_code=404, detail="Course not found")
    
    await ensure_tenant_access(
        course.tenant_id,
        current_user,
        session,
        require_write=_request_requires_write(request),
    )
    return course

async def get_managed_module(
    module_id: uuid.UUID,
    request: Request = None,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
) -> Module:
    """
    Dependency to fetch a module and verify management access via its course.
    """
    module = await session.get(Module, module_id)
    if not module or module.deleted_at:
        raise HTTPException(status_code=404, detail="Module not found")
    
    course = await session.get(Course, module.course_id)
    if not course or course.deleted_at:
        raise HTTPException(status_code=404, detail="Course context not found")
        
    await ensure_tenant_access(
        course.tenant_id,
        current_user,
        session,
        require_write=_request_requires_write(request),
    )
    return module

async def get_managed_lesson(
    lesson_id: uuid.UUID,
    request: Request = None,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
) -> Lesson:
    """
    Dependency to fetch a lesson and verify management access via its module/course.
    """
    lesson = await session.get(Lesson, lesson_id)
    if not lesson or lesson.deleted_at:
        raise HTTPException(status_code=404, detail="Lesson not found")
    
    module = await session.get(Module, lesson.module_id)
    if not module or module.deleted_at:
        raise HTTPException(status_code=404, detail="Module context not found")
        
    course = await session.get(Course, module.course_id)
    if not course or course.deleted_at:
        raise HTTPException(status_code=404, detail="Course context not found")
        
    await ensure_tenant_access(
        course.tenant_id,
        current_user,
        session,
        require_write=_request_requires_write(request),
    )
    return lesson


def _request_requires_write(request: Request | None) -> bool:
    return bool(request and request.method.upper() not in {"GET", "HEAD", "OPTIONS"})
