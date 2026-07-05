from dataclasses import dataclass
from typing import Optional

from fastapi import HTTPException
from sqlmodel.ext.asyncio.session import AsyncSession

from ...models import Course, Lesson, Module, Tenant, TenantMember, User
from .access import (
    check_access,
    ensure_active_membership,
    ensure_active_subscription,
    is_tenant_admin_member,
)
from .group_membership import ensure_current_learning_group_access


LOCKED_LESSON_CONTENT = "This lesson is locked."


@dataclass(frozen=True)
class LessonAccessState:
    module: Module
    course: Course
    tenant: Tenant
    membership: Optional[TenantMember]
    is_admin: bool
    is_locked: bool
    lock_reason: Optional[str]


async def get_lesson_access_state(
    *,
    session: AsyncSession,
    lesson: Lesson,
    current_user: User,
    require_membership: bool,
) -> LessonAccessState:
    module, course = await get_lesson_context(session, lesson)
    tenant = await ensure_active_subscription(course.tenant_id, session)
    admin = await is_tenant_admin_member(course.tenant_id, current_user, session)

    membership = None
    if require_membership or not admin:
        membership = await ensure_active_membership(current_user.id, course.tenant_id, session)
        await ensure_current_learning_group_access(
            session=session,
            current_user=current_user,
            tenant=tenant,
            membership=membership,
        )

    locked, reason = await get_lesson_lock_state(
        lesson=lesson,
        module=module,
        course=course,
        tenant=tenant,
        membership=membership,
        current_user=current_user,
        is_admin=admin,
    )

    return LessonAccessState(
        module=module,
        course=course,
        tenant=tenant,
        membership=membership,
        is_admin=admin,
        is_locked=locked,
        lock_reason=reason,
    )


async def get_lesson_context(
    session: AsyncSession,
    lesson: Lesson,
) -> tuple[Module, Course]:
    module = await session.get(Module, lesson.module_id)
    if not module or module.deleted_at:
        raise HTTPException(status_code=404, detail="Module context not found")

    course = await session.get(Course, module.course_id)
    if not course or course.deleted_at or not course.is_published or not lesson.is_published:
        raise HTTPException(status_code=404, detail="Course not found")

    return module, course


async def get_lesson_lock_state(
    *,
    lesson: Lesson,
    module: Module,
    course: Course,
    tenant: Tenant,
    membership: Optional[TenantMember],
    current_user: User,
    is_admin: bool,
) -> tuple[bool, Optional[str]]:
    course_locked, course_reason = await check_access(
        course,
        membership,
        tenant,
        current_user.telegram_id,
        is_admin=is_admin,
    )
    module_locked, module_reason = await check_access(
        module,
        membership,
        tenant,
        current_user.telegram_id,
        is_admin=is_admin,
        parent_locked=course_locked,
        parent_reason=course_reason,
    )
    return await check_access(
        lesson,
        membership,
        tenant,
        current_user.telegram_id,
        is_admin=is_admin,
        parent_locked=module_locked,
        parent_reason=module_reason,
    )


def lesson_webapp_payload(
    lesson: Lesson,
    *,
    is_locked: bool,
    lock_reason: Optional[str],
    is_completed: Optional[bool] = None,
) -> dict:
    lesson_data = lesson.model_dump()
    lesson_data["is_locked"] = is_locked
    lesson_data["lock_reason"] = lock_reason

    if is_completed is not None:
        lesson_data["is_completed"] = is_completed

    if is_locked:
        lesson_data["cover_url"] = None
        lesson_data["video_provider"] = None
        lesson_data["video_id"] = ""
        lesson_data["content"] = LOCKED_LESSON_CONTENT
        lesson_data["mux_upload_id"] = None
        lesson_data["mux_asset_id"] = None
        lesson_data["mux_playback_id"] = None
        lesson_data["mux_status"] = None

    return lesson_data
