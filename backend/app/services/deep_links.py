import re
import uuid
from dataclasses import dataclass
from typing import Literal

from fastapi import HTTPException
from sqlmodel.ext.asyncio.session import AsyncSession

from ..config import settings
from ..models import Course, Lesson, Module, User
from .webapp.access import (
    check_access,
    ensure_active_membership,
    ensure_active_subscription,
    is_tenant_admin_member,
)
from .webapp.group_membership import ensure_current_learning_group_access
from .tenant_links import safe_free_group_link_for_response
from .webapp.lesson_access import get_lesson_context, get_lesson_lock_state


StartParamType = Literal["course", "module", "lesson"]

MAX_START_PARAM_LENGTH = 512
MAX_BOT_START_PARAM_LENGTH = 64
COURSE_PREFIX = "course_"
MODULE_PREFIX = "module_"
LESSON_PREFIX = "lesson_"
START_PARAM_PATTERN = re.compile(r"^[A-Za-z0-9_-]+$")


@dataclass(frozen=True)
class DeepLinkPayload:
    type: StartParamType
    resource_id: uuid.UUID


def build_lesson_start_param(lesson_id: uuid.UUID) -> str:
    return f"{LESSON_PREFIX}{lesson_id}"


def build_course_start_param(course_id: uuid.UUID) -> str:
    return f"{COURSE_PREFIX}{course_id}"


def build_module_start_param(module_id: uuid.UUID) -> str:
    return f"{MODULE_PREFIX}{module_id}"


def build_mini_app_link(start_param: str) -> str:
    validate_start_param(start_param)
    bot_username = _get_bot_username()
    app_name = settings.APP_SHORT_NAME.strip().strip("/")
    if not app_name:
        raise HTTPException(status_code=500, detail="APP_SHORT_NAME is not configured")
    return f"https://t.me/{bot_username}/{app_name}?startapp={start_param}"


def build_bot_start_link(start_param: str) -> str:
    normalized = validate_start_param(start_param)
    if len(normalized) > MAX_BOT_START_PARAM_LENGTH:
        raise HTTPException(status_code=400, detail="Bot start link is too long")
    bot_username = _get_bot_username()
    return f"https://t.me/{bot_username}?start={normalized}"


def build_lesson_bot_start_link(lesson_id: uuid.UUID) -> str:
    return build_bot_start_link(build_lesson_start_param(lesson_id))


def parse_start_param(start_param: str) -> DeepLinkPayload:
    normalized = validate_start_param(start_param)
    for prefix, payload_type in (
        (LESSON_PREFIX, "lesson"),
        (COURSE_PREFIX, "course"),
        (MODULE_PREFIX, "module"),
    ):
        if not normalized.startswith(prefix):
            continue

        raw_id = normalized.removeprefix(prefix)
        try:
            resource_id = uuid.UUID(raw_id)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail="Invalid deep link") from exc

        return DeepLinkPayload(type=payload_type, resource_id=resource_id)

    raise HTTPException(status_code=400, detail="Unsupported deep link")


async def resolve_start_param(
    *,
    start_param: str,
    current_user: User,
    session: AsyncSession,
) -> dict:
    payload = parse_start_param(start_param)
    if payload.type == "lesson":
        return await _resolve_lesson_link(payload.resource_id, current_user, session)
    if payload.type == "module":
        return await _resolve_module_link(payload.resource_id, current_user, session)
    if payload.type == "course":
        return await _resolve_course_link(payload.resource_id, current_user, session)

    raise HTTPException(status_code=400, detail="Unsupported deep link")


def validate_start_param(start_param: str) -> str:
    normalized = start_param.strip()
    if not normalized:
        raise HTTPException(status_code=400, detail="Deep link is empty")
    if len(normalized) > MAX_START_PARAM_LENGTH:
        raise HTTPException(status_code=400, detail="Deep link is too long")
    if not START_PARAM_PATTERN.fullmatch(normalized):
        raise HTTPException(status_code=400, detail="Deep link contains invalid characters")
    return normalized


async def _resolve_lesson_link(
    lesson_id: uuid.UUID,
    current_user: User,
    session: AsyncSession,
) -> dict:
    lesson = await session.get(Lesson, lesson_id)
    if not lesson or lesson.deleted_at or not lesson.is_published:
        raise HTTPException(status_code=404, detail="Lesson not found")

    module, course = await get_lesson_context(session, lesson)
    tenant = await ensure_active_subscription(course.tenant_id, session)
    is_admin = await is_tenant_admin_member(course.tenant_id, current_user, session)

    membership = None
    if not is_admin:
        try:
            membership = await ensure_active_membership(current_user.id, course.tenant_id, session)
            await ensure_current_learning_group_access(
                session=session,
                current_user=current_user,
                tenant=tenant,
                membership=membership,
            )
        except HTTPException as exc:
            if exc.status_code != 403:
                raise
            return _lesson_join_required_payload(
                lesson=lesson,
                course=course,
                tenant=tenant,
                denied_reason=str(exc.detail),
            )

    locked, reason = await get_lesson_lock_state(
        lesson=lesson,
        module=module,
        course=course,
        tenant=tenant,
        membership=membership,
        current_user=current_user,
        is_admin=is_admin,
    )

    return {
        "type": "lesson",
        "lesson_id": str(lesson.id),
        "lesson_title": lesson.title,
        "course_id": str(course.id),
        "course_title": course.title,
        "tenant_id": str(course.tenant_id),
        "tenant_name": tenant.name,
        "target_path": f"/lesson/{lesson.id}",
        "is_locked": locked,
        "lock_reason": reason,
        "requires_group_join": False,
        "free_group_link": safe_free_group_link_for_response(tenant.free_group_link),
    }


def _lesson_join_required_payload(
    *,
    lesson: Lesson,
    course: Course,
    tenant,
    denied_reason: str,
) -> dict:
    return {
        "type": "lesson",
        "lesson_id": str(lesson.id),
        "lesson_title": lesson.title,
        "course_id": str(course.id),
        "course_title": course.title,
        "tenant_id": str(course.tenant_id),
        "tenant_name": tenant.name,
        "target_path": f"/lesson/{lesson.id}",
        "is_locked": True,
        "lock_reason": denied_reason or "Вступите в группу, чтобы открыть урок.",
        "requires_group_join": True,
        "access_status": "group_required",
        "free_group_link": safe_free_group_link_for_response(tenant.free_group_link),
    }


async def _resolve_module_link(
    module_id: uuid.UUID,
    current_user: User,
    session: AsyncSession,
) -> dict:
    module = await session.get(Module, module_id)
    if not module or module.deleted_at:
        raise HTTPException(status_code=404, detail="Module not found")

    course = await session.get(Course, module.course_id)
    if not course or course.deleted_at or not course.is_published:
        raise HTTPException(status_code=404, detail="Course not found")

    tenant = await ensure_active_subscription(course.tenant_id, session)
    is_admin = await is_tenant_admin_member(course.tenant_id, current_user, session)

    membership = None
    if not is_admin:
        membership = await ensure_active_membership(current_user.id, course.tenant_id, session)
        await ensure_current_learning_group_access(
            session=session,
            current_user=current_user,
            tenant=tenant,
            membership=membership,
        )

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

    return {
        "type": "module",
        "module_id": str(module.id),
        "course_id": str(course.id),
        "tenant_id": str(course.tenant_id),
        "target_path": f"/course/{course.id}?moduleId={module.id}",
        "is_locked": module_locked,
        "lock_reason": module_reason,
    }


async def _resolve_course_link(
    course_id: uuid.UUID,
    current_user: User,
    session: AsyncSession,
) -> dict:
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

    return {
        "type": "course",
        "course_id": str(course.id),
        "tenant_id": str(course.tenant_id),
        "target_path": f"/course/{course.id}",
        "is_locked": is_locked,
        "lock_reason": lock_reason,
    }


def _get_bot_username() -> str:
    username = (settings.BOT_USERNAME or "").strip().lstrip("@")
    if not username:
        raise HTTPException(status_code=500, detail="BOT_USERNAME is not configured")
    return username
