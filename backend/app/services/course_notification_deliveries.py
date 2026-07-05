import uuid
from datetime import datetime, timedelta
from typing import Optional

from sqlalchemy import and_
from sqlalchemy.exc import IntegrityError
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from ..models import (
    Course,
    CourseNotificationDelivery,
    CourseNotificationDeliveryStatus,
    CourseNotificationEventType,
    CourseSubscription,
    Lesson,
    MemberStatus,
    Module,
    TenantMember,
    User,
)


PENDING_RETRY_AFTER = timedelta(minutes=5)


async def load_active_subscribers(
    session: AsyncSession,
    course: Course,
) -> list[tuple[User, TenantMember]]:
    statement = (
        select(User, TenantMember)
        .join(CourseSubscription, CourseSubscription.user_id == User.id)
        .join(
            TenantMember,
            and_(
                TenantMember.user_id == User.id,
                TenantMember.tenant_id == CourseSubscription.tenant_id,
            ),
        )
        .where(
            CourseSubscription.course_id == course.id,
            CourseSubscription.tenant_id == course.tenant_id,
            CourseSubscription.is_active == True,
            User.deleted_at == None,
            User.is_blocked == False,
            TenantMember.status == MemberStatus.active,
            TenantMember.deleted_at == None,
        )
    )
    result = await session.exec(statement)
    return result.all()


async def build_delivery(
    *,
    session: AsyncSession,
    event_type: CourseNotificationEventType,
    course: Course,
    module: Optional[Module],
    lesson: Optional[Lesson],
    user: User,
    source_id: uuid.UUID,
) -> Optional[CourseNotificationDelivery]:
    idempotency_key = f"{event_type.value}:{source_id}:{user.id}"
    result = await session.exec(
        select(CourseNotificationDelivery).where(
            CourseNotificationDelivery.idempotency_key == idempotency_key
        )
    )
    existing = result.first()
    if existing:
        return existing if is_retryable_delivery(existing) else None

    delivery = CourseNotificationDelivery(
        tenant_id=course.tenant_id,
        course_id=course.id,
        user_id=user.id,
        event_type=event_type,
        idempotency_key=idempotency_key,
        module_id=module.id if module else None,
        lesson_id=lesson.id if lesson else None,
    )
    session.add(delivery)
    try:
        await session.commit()
    except IntegrityError:
        await session.rollback()
        return None
    await session.refresh(delivery)
    return delivery


def is_retryable_delivery(delivery: CourseNotificationDelivery) -> bool:
    if delivery.status == CourseNotificationDeliveryStatus.failed:
        return True
    if delivery.status != CourseNotificationDeliveryStatus.pending:
        return False

    return delivery.created_at <= datetime.utcnow() - PENDING_RETRY_AFTER


async def mark_delivery(
    session: AsyncSession,
    delivery: CourseNotificationDelivery,
    status: CourseNotificationDeliveryStatus,
    error: Optional[str],
) -> None:
    delivery.status = status
    delivery.error = error[:1000] if error else None
    if status == CourseNotificationDeliveryStatus.sent:
        delivery.sent_at = datetime.utcnow()
    session.add(delivery)
    await session.commit()
