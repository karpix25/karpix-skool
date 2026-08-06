import uuid

from fastapi import APIRouter, Depends
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from ..db import get_session
from ..models import Course, User
from ..models_favorites import CourseFavorite
from ..services.tenant_links import safe_vip_group_link_for_response
from ..services.webapp.access import check_access, ensure_active_membership, is_tenant_admin_member
from ..services.webapp.course_progress import get_course_progress_detail
from ..services.webapp.favorites import (
    add_course_favorite,
    ensure_favorite_tenant_access,
    remove_course_favorite,
)
from .auth import get_current_user

router = APIRouter()


@router.get("/favorites")
async def list_student_favorites(
    tenant_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    tenant = await ensure_favorite_tenant_access(
        session=session,
        current_user=current_user,
        tenant_id=tenant_id,
    )
    membership = None if current_user.is_super_admin else await ensure_active_membership(
        current_user.id,
        tenant_id,
        session,
    )
    is_admin = current_user.is_super_admin or await is_tenant_admin_member(
        tenant_id,
        current_user,
        session,
    )
    result = await session.exec(
        select(CourseFavorite, Course)
        .join(Course, Course.id == CourseFavorite.course_id)
        .where(
            CourseFavorite.user_id == current_user.id,
            CourseFavorite.tenant_id == tenant_id,
            Course.tenant_id == tenant_id,
            Course.is_published == True,
            Course.deleted_at == None,
        )
        .order_by(CourseFavorite.created_at.desc())
    )
    favorites = []
    for favorite, course in result.all():
        course_data = course.model_dump()
        is_locked, lock_reason = await check_access(
            course,
            membership,
            tenant,
            current_user.telegram_id,
            is_admin=is_admin,
        )
        progress = await get_course_progress_detail(
            session=session,
            user_id=current_user.id,
            course_id=course.id,
        )
        course_data["progress_percent"] = progress.course_progress["progress_percent"]
        course_data["is_unlocked"] = not is_locked
        course_data["lock_reason"] = lock_reason
        course_data["vip_group_link"] = safe_vip_group_link_for_response(tenant.vip_group_link)
        course_data["is_favorite"] = True
        course_data["favorite_created_at"] = favorite.created_at
        favorites.append(course_data)
    return favorites


@router.post("/courses/{course_id}/favorite")
async def create_student_favorite(
    course_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    favorite = await add_course_favorite(
        session=session,
        current_user=current_user,
        course_id=course_id,
    )
    return {
        "course_id": favorite.course_id,
        "tenant_id": favorite.tenant_id,
        "is_favorite": True,
        "created_at": favorite.created_at,
    }


@router.delete("/courses/{course_id}/favorite")
async def delete_student_favorite(
    course_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    await remove_course_favorite(
        session=session,
        current_user=current_user,
        course_id=course_id,
    )
    return {"course_id": course_id, "is_favorite": False}
