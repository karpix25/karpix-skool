from fastapi import HTTPException, Depends
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlmodel import select
import uuid
from typing import Type, TypeVar, Optional

from ..db import get_session
from ..models import User, Tenant, TenantMember, MemberRole, Course, Module, Lesson
from ..routes.auth import get_current_user

T = TypeVar("T")

async def ensure_tenant_access(
    tenant_id: uuid.UUID,
    user: User,
    session: AsyncSession
) -> TenantMember:
    """
    Verifies that the user has administrative access to the given tenant.
    Returns the membership if successful, raises 403 otherwise.
    """
    if user.is_super_admin:
        return None # SuperAdmins bypass, we don't return a specific membership

    stmt = select(TenantMember).where(
        TenantMember.user_id == user.id,
        TenantMember.tenant_id == tenant_id,
        TenantMember.role.in_([MemberRole.admin, MemberRole.owner, MemberRole.moderator])
    )
    res = await session.exec(stmt)
    membership = res.first()
    
    if not membership:
        raise HTTPException(
            status_code=403, 
            detail="Forbidden: You do not have management access to this school."
        )
    return membership

async def get_managed_course(
    course_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
) -> Course:
    """
    Dependency to fetch a course and verify management access.
    """
    course = await session.get(Course, course_id)
    if not course or course.deleted_at:
        raise HTTPException(status_code=404, detail="Course not found")
    
    await ensure_tenant_access(course.tenant_id, current_user, session)
    return course

async def get_managed_module(
    module_id: uuid.UUID,
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
        
    await ensure_tenant_access(course.tenant_id, current_user, session)
    return module

async def get_managed_lesson(
    lesson_id: uuid.UUID,
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
        
    await ensure_tenant_access(course.tenant_id, current_user, session)
    return lesson
