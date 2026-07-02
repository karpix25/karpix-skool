from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from ..db import get_session
from ..models import Course, Lesson, Module, UnlockType
from ..schemas.courses import ModuleCreate, ModuleRead, ModuleUpdate
from ..services.cache_invalidation import invalidate_course_write_caches
from ..utils.security import get_managed_course, get_managed_module

router = APIRouter()


@router.post("/{course_id}/modules", response_model=ModuleRead)
async def create_module(
    module_in: ModuleCreate,
    course: Course = Depends(get_managed_course),
    session: AsyncSession = Depends(get_session),
):
    new_module = Module(
        course_id=course.id,
        title=module_in.title,
        unlock_type=module_in.unlock_type or UnlockType.immediate,
        unlock_value=module_in.unlock_value,
        order_index=module_in.order_index,
        is_vip=module_in.is_vip,
    )
    session.add(new_module)
    await session.commit()
    await session.refresh(new_module)
    await invalidate_course_write_caches(course_id=course.id, tenant_id=course.tenant_id)
    return new_module


@router.get("/{course_id}/modules", response_model=List[ModuleRead])
async def list_modules(
    course: Course = Depends(get_managed_course),
    session: AsyncSession = Depends(get_session),
):
    stmt = select(Module).where(Module.course_id == course.id, Module.deleted_at == None).order_by(Module.order_index)
    result = await session.exec(stmt)
    return result.all()


@router.patch("/modules/{module_id}", response_model=ModuleRead)
async def patch_module(
    module_in: ModuleUpdate,
    module: Module = Depends(get_managed_module),
    session: AsyncSession = Depends(get_session),
):
    for field in ("title", "unlock_type", "unlock_value", "order_index", "is_vip"):
        value = getattr(module_in, field)
        if value is not None:
            setattr(module, field, value)

    session.add(module)
    await session.commit()
    await session.refresh(module)
    course = await session.get(Course, module.course_id)
    if course:
        await invalidate_course_write_caches(course_id=course.id, tenant_id=course.tenant_id)
    return module


@router.post("/modules/{module_id}/duplicate", response_model=ModuleRead)
async def duplicate_module(
    module: Module = Depends(get_managed_module),
    session: AsyncSession = Depends(get_session),
):
    stmt_max = select(Module).where(Module.course_id == module.course_id, Module.deleted_at == None)
    res_max = await session.exec(stmt_max)
    all_modules = res_max.all()
    max_idx = max([item.order_index for item in all_modules]) if all_modules else 0

    new_module = Module(
        course_id=module.course_id,
        title=f"{module.title} (Copy)",
        unlock_type=module.unlock_type,
        unlock_value=module.unlock_value,
        order_index=max_idx + 1,
        is_vip=module.is_vip,
    )
    session.add(new_module)
    await session.flush()

    stmt_l = select(Lesson).where(Lesson.module_id == module.id, Lesson.deleted_at == None).order_by(Lesson.order_index)
    res_l = await session.exec(stmt_l)
    for lesson in res_l.all():
        session.add(
            Lesson(
                module_id=new_module.id,
                title=lesson.title,
                video_provider=lesson.video_provider,
                video_id=lesson.video_id,
                content=lesson.content,
                order_index=lesson.order_index,
                is_published=lesson.is_published,
                is_vip=lesson.is_vip,
                unlock_type=lesson.unlock_type,
                unlock_value=lesson.unlock_value,
            )
        )

    await session.commit()
    await session.refresh(new_module)
    course = await session.get(Course, new_module.course_id)
    if course:
        await invalidate_course_write_caches(course_id=course.id, tenant_id=course.tenant_id)
    return new_module


@router.delete("/modules/{module_id}")
async def delete_module(
    module: Module = Depends(get_managed_module),
    session: AsyncSession = Depends(get_session),
):
    course_id = module.course_id
    module.deleted_at = datetime.utcnow()
    session.add(module)
    await session.commit()
    course = await session.get(Course, course_id)
    if course:
        await invalidate_course_write_caches(course_id=course.id, tenant_id=course.tenant_id)
    return {"message": "Module deleted", "course_id": course_id}
