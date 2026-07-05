import uuid
from datetime import datetime

from fastapi import HTTPException
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from ...models import Course, CourseSubscription, User
from .access import (
    check_access,
    ensure_active_membership,
    ensure_active_subscription,
    is_tenant_admin_member,
)
from .group_membership import ensure_current_learning_group_access


async def get_course_subscription_state(
    *,
    session: AsyncSession,
    current_user: User,
    course_id: uuid.UUID,
) -> CourseSubscription:
    course = await ensure_subscribable_course(
        session=session,
        current_user=current_user,
        course_id=course_id,
    )
    return await get_or_build_subscription(session, current_user, course)


async def subscribe_to_course(
    *,
    session: AsyncSession,
    current_user: User,
    course_id: uuid.UUID,
) -> CourseSubscription:
    course = await ensure_subscribable_course(
        session=session,
        current_user=current_user,
        course_id=course_id,
    )
    subscription = await get_or_build_subscription(session, current_user, course)
    subscription.is_active = True
    subscription.updated_at = datetime.utcnow()
    session.add(subscription)
    await session.commit()
    await session.refresh(subscription)
    return subscription


async def unsubscribe_from_course(
    *,
    session: AsyncSession,
    current_user: User,
    course_id: uuid.UUID,
) -> CourseSubscription:
    course = await ensure_subscribable_course(
        session=session,
        current_user=current_user,
        course_id=course_id,
    )
    subscription = await find_subscription(session, current_user, course)
    if not subscription:
        return build_inactive_subscription(current_user, course)

    subscription.is_active = False
    subscription.updated_at = datetime.utcnow()
    session.add(subscription)
    await session.commit()
    await session.refresh(subscription)
    return subscription


async def ensure_subscribable_course(
    *,
    session: AsyncSession,
    current_user: User,
    course_id: uuid.UUID,
) -> Course:
    course = await session.get(Course, course_id)
    if not course or course.deleted_at or not course.is_published:
        raise HTTPException(status_code=404, detail="Course not found")

    tenant = await ensure_active_subscription(course.tenant_id, session)
    membership = await ensure_active_membership(current_user.id, course.tenant_id, session)
    await ensure_current_learning_group_access(
        session=session,
        current_user=current_user,
        tenant=tenant,
        membership=membership,
    )

    is_admin = await is_tenant_admin_member(course.tenant_id, current_user, session)
    is_locked, lock_reason = await check_access(
        course,
        membership,
        tenant,
        current_user.telegram_id,
        is_admin=is_admin,
    )
    if is_locked:
        raise HTTPException(status_code=403, detail=lock_reason or "Course is locked")

    return course


async def get_or_build_subscription(
    session: AsyncSession,
    current_user: User,
    course: Course,
) -> CourseSubscription:
    subscription = await find_subscription(session, current_user, course)
    if subscription:
        return subscription

    return build_inactive_subscription(current_user, course)


async def find_subscription(
    session: AsyncSession,
    current_user: User,
    course: Course,
) -> CourseSubscription | None:
    result = await session.exec(
        select(CourseSubscription).where(
            CourseSubscription.course_id == course.id,
            CourseSubscription.user_id == current_user.id,
        )
    )
    return result.first()


def build_inactive_subscription(current_user: User, course: Course) -> CourseSubscription:
    return CourseSubscription(
        tenant_id=course.tenant_id,
        course_id=course.id,
        user_id=current_user.id,
        is_active=False,
    )
