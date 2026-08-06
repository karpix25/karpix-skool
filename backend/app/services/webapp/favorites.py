import uuid

from fastapi import HTTPException
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from ...models import Course, Tenant, User
from ...models_favorites import CourseFavorite
from .access import ensure_active_membership, ensure_active_subscription
from .group_membership import ensure_current_learning_group_access


async def ensure_favorite_tenant_access(
    *,
    session: AsyncSession,
    current_user: User,
    tenant_id: uuid.UUID,
) -> Tenant:
    tenant = await ensure_active_subscription(tenant_id, session)
    if current_user.is_super_admin:
        return tenant

    membership = await ensure_active_membership(current_user.id, tenant_id, session)
    await ensure_current_learning_group_access(
        session=session,
        current_user=current_user,
        tenant=tenant,
        membership=membership,
    )
    return tenant


async def get_favorite_course_ids(
    *,
    session: AsyncSession,
    user_id: uuid.UUID,
    tenant_ids: list[uuid.UUID],
) -> set[uuid.UUID]:
    if not tenant_ids:
        return set()
    result = await session.exec(
        select(CourseFavorite.course_id).where(
            CourseFavorite.user_id == user_id,
            CourseFavorite.tenant_id.in_(tenant_ids),
        )
    )
    return set(result.all())


async def is_course_favorite(
    *,
    session: AsyncSession,
    user_id: uuid.UUID,
    tenant_id: uuid.UUID,
    course_id: uuid.UUID,
) -> bool:
    result = await session.exec(
        select(CourseFavorite.id).where(
            CourseFavorite.user_id == user_id,
            CourseFavorite.tenant_id == tenant_id,
            CourseFavorite.course_id == course_id,
        )
    )
    return result.first() is not None


async def ensure_favorite_course(
    *,
    session: AsyncSession,
    current_user: User,
    course_id: uuid.UUID,
) -> Course:
    course = await session.get(Course, course_id)
    if not course or course.deleted_at or not course.is_published:
        raise HTTPException(status_code=404, detail="Course not found")
    await ensure_favorite_tenant_access(
        session=session,
        current_user=current_user,
        tenant_id=course.tenant_id,
    )
    return course


async def add_course_favorite(
    *,
    session: AsyncSession,
    current_user: User,
    course_id: uuid.UUID,
) -> CourseFavorite:
    course = await ensure_favorite_course(
        session=session,
        current_user=current_user,
        course_id=course_id,
    )
    result = await session.exec(
        select(CourseFavorite).where(
            CourseFavorite.user_id == current_user.id,
            CourseFavorite.tenant_id == course.tenant_id,
            CourseFavorite.course_id == course.id,
        )
    )
    favorite = result.first()
    if favorite:
        return favorite

    favorite = CourseFavorite(
        user_id=current_user.id,
        tenant_id=course.tenant_id,
        course_id=course.id,
    )
    session.add(favorite)
    await session.commit()
    await session.refresh(favorite)
    return favorite


async def remove_course_favorite(
    *,
    session: AsyncSession,
    current_user: User,
    course_id: uuid.UUID,
) -> None:
    course = await session.get(Course, course_id)
    if not course:
        return
    await ensure_favorite_tenant_access(
        session=session,
        current_user=current_user,
        tenant_id=course.tenant_id,
    )
    result = await session.exec(
        select(CourseFavorite).where(
            CourseFavorite.user_id == current_user.id,
            CourseFavorite.tenant_id == course.tenant_id,
            CourseFavorite.course_id == course.id,
        )
    )
    favorite = result.first()
    if favorite:
        await session.delete(favorite)
        await session.commit()
