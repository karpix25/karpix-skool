import uuid
from typing import Awaitable, Callable, Optional

from sqlmodel.ext.asyncio.session import AsyncSession

from ..models import (
    Course,
    CourseNotificationDeliveryStatus,
    CourseNotificationEventType,
    Lesson,
    MemberRole,
    Module,
    Tenant,
    TenantMember,
    User,
)
from ..utils.logging_config import logger
from .course_notification_deliveries import build_delivery, load_active_subscribers, mark_delivery
from .deep_links import (
    build_lesson_start_param,
    build_mini_app_link,
    build_module_start_param,
)
from .telegram_course_notifications import send_telegram_link_notification
from .webapp.access import check_access
from .webapp.group_membership import has_current_learning_group_access


NotificationSender = Callable[[int, str, str, str], Awaitable[None]]
TENANT_MANAGER_ROLES = {MemberRole.owner, MemberRole.admin, MemberRole.moderator}


async def notify_module_published(
    *,
    session: AsyncSession,
    module: Module,
    sender: Optional[NotificationSender] = None,
) -> int:
    course = await session.get(Course, module.course_id)
    if not course or course.deleted_at or not course.is_published or module.deleted_at:
        return 0

    link = build_notification_link(build_module_start_param(module.id), module.id)
    if not link:
        return 0

    text = f"В курсе «{course.title}» появился новый модуль: «{module.title}»."
    return await notify_course_subscribers(
        session=session,
        course=course,
        event_type=CourseNotificationEventType.module_published,
        module=module,
        lesson=None,
        text=text,
        button_text="Открыть модуль",
        url=link,
        sender=sender,
    )


async def notify_lesson_published(
    *,
    session: AsyncSession,
    lesson: Lesson,
    sender: Optional[NotificationSender] = None,
) -> int:
    if lesson.deleted_at or not lesson.is_published:
        return 0

    module = await session.get(Module, lesson.module_id)
    if not module or module.deleted_at:
        return 0

    course = await session.get(Course, module.course_id)
    if not course or course.deleted_at or not course.is_published:
        return 0

    link = build_notification_link(build_lesson_start_param(lesson.id), lesson.id)
    if not link:
        return 0

    text = f"В курсе «{course.title}» появился новый урок: «{lesson.title}»."
    return await notify_course_subscribers(
        session=session,
        course=course,
        event_type=CourseNotificationEventType.lesson_published,
        module=module,
        lesson=lesson,
        text=text,
        button_text="Открыть урок",
        url=link,
        sender=sender,
    )


async def notify_course_subscribers(
    *,
    session: AsyncSession,
    course: Course,
    event_type: CourseNotificationEventType,
    module: Optional[Module],
    lesson: Optional[Lesson],
    text: str,
    button_text: str,
    url: str,
    sender: Optional[NotificationSender] = None,
) -> int:
    tenant = await session.get(Tenant, course.tenant_id)
    if not tenant:
        return 0

    sent_count = 0
    for user, membership in await load_active_subscribers(session, course):
        source_id = lesson.id if lesson else module.id if module else course.id
        delivery = await build_delivery(
            session=session,
            event_type=event_type,
            course=course,
            module=module,
            lesson=lesson,
            user=user,
            source_id=source_id,
        )
        if not delivery:
            continue

        can_notify, reason = await can_notify_subscriber(
            session=session,
            user=user,
            membership=membership,
            tenant=tenant,
            course=course,
            module=module,
            lesson=lesson,
        )
        if not can_notify:
            await mark_delivery(session, delivery, CourseNotificationDeliveryStatus.skipped, reason)
            continue

        try:
            await (sender or send_telegram_link_notification)(user.telegram_id, text, button_text, url)
        except Exception as exc:  # pragma: no cover - exercised with fake sender in service tests.
            logger.warning("Course notification failed for user=%s course=%s: %s", user.id, course.id, exc)
            await mark_delivery(session, delivery, CourseNotificationDeliveryStatus.failed, str(exc))
            continue

        sent_count += 1
        await mark_delivery(session, delivery, CourseNotificationDeliveryStatus.sent, None)

    return sent_count


def build_notification_link(start_param: str, source_id: uuid.UUID) -> Optional[str]:
    try:
        return build_mini_app_link(start_param)
    except Exception as exc:
        logger.warning("Course notification link unavailable for source=%s: %s", source_id, exc)
        return None


async def can_notify_subscriber(
    *,
    session: AsyncSession,
    user: User,
    membership: TenantMember,
    tenant: Tenant,
    course: Course,
    module: Optional[Module],
    lesson: Optional[Lesson],
) -> tuple[bool, Optional[str]]:
    if user.telegram_id is None:
        return False, "User has no Telegram id"

    if not await has_current_learning_group_access(
        session=session,
        current_user=user,
        tenant=tenant,
        membership=membership,
    ):
        return False, "User is not in the linked Telegram group"

    is_admin = bool(user.is_super_admin or membership.role in TENANT_MANAGER_ROLES)
    course_locked, course_reason = await check_access(
        course,
        membership,
        tenant,
        user.telegram_id,
        is_admin=is_admin,
    )
    if course_locked:
        return False, course_reason

    if module:
        module_locked, module_reason = await check_access(
            module,
            membership,
            tenant,
            user.telegram_id,
            is_admin=is_admin,
            parent_locked=course_locked,
            parent_reason=course_reason,
        )
        if module_locked:
            return False, module_reason

    if lesson:
        lesson_locked, lesson_reason = await check_access(
            lesson,
            membership,
            tenant,
            user.telegram_id,
            is_admin=is_admin,
        )
        if lesson_locked:
            return False, lesson_reason

    return True, None
