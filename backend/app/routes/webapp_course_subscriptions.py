import uuid

from fastapi import APIRouter, Depends
from sqlmodel.ext.asyncio.session import AsyncSession

from ..db import get_session
from ..models import CourseSubscription, User
from ..schemas.course_subscriptions import CourseSubscriptionRead
from ..services.webapp.course_subscriptions import (
    get_course_subscription_state,
    subscribe_to_course,
    unsubscribe_from_course,
)
from .auth import get_current_user


router = APIRouter()


@router.get("/courses/{course_id}/subscription", response_model=CourseSubscriptionRead)
async def get_course_subscription(
    course_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    subscription = await get_course_subscription_state(
        session=session,
        current_user=current_user,
        course_id=course_id,
    )
    return serialize_subscription(subscription)


@router.post("/courses/{course_id}/subscription", response_model=CourseSubscriptionRead)
async def create_course_subscription(
    course_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    subscription = await subscribe_to_course(
        session=session,
        current_user=current_user,
        course_id=course_id,
    )
    return serialize_subscription(subscription)


@router.delete("/courses/{course_id}/subscription", response_model=CourseSubscriptionRead)
async def delete_course_subscription(
    course_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    subscription = await unsubscribe_from_course(
        session=session,
        current_user=current_user,
        course_id=course_id,
    )
    return serialize_subscription(subscription)


def serialize_subscription(subscription: CourseSubscription) -> CourseSubscriptionRead:
    return CourseSubscriptionRead(
        course_id=subscription.course_id,
        is_subscribed=subscription.is_active,
        updated_at=subscription.updated_at,
    )
