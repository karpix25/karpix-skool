import re
import uuid
from dataclasses import dataclass
from typing import Literal

from fastapi import HTTPException
from sqlmodel.ext.asyncio.session import AsyncSession

from ..config import settings
from ..models import Course, Lesson, User
from .webapp.access import (
    check_access,
    ensure_active_membership,
    ensure_active_subscription,
    is_tenant_admin_member,
)
from .webapp.group_membership import ensure_current_learning_group_access
from .webapp.lesson_access import get_lesson_access_state


StartParamType = Literal["course", "lesson"]

MAX_START_PARAM_LENGTH = 512
COURSE_PREFIX = "course_"
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


def build_mini_app_link(start_param: str) -> str:
    validate_start_param(start_param)
    bot_username = _get_bot_username()
    app_name = settings.APP_SHORT_NAME.strip().strip("/")
    if not app_name:
        raise HTTPException(status_code=500, detail="APP_SHORT_NAME is not configured")
    return f"https://t.me/{bot_username}/{app_name}?startapp={start_param}"


def parse_start_param(start_param: str) -> DeepLinkPayload:
    normalized = validate_start_param(start_param)
    for prefix, payload_type in (
        (LESSON_PREFIX, "lesson"),
        (COURSE_PREFIX, "course"),
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

    access = await get_lesson_access_state(
        session=session,
        lesson=lesson,
        current_user=current_user,
        require_membership=False,
    )

    return {
        "type": "lesson",
        "lesson_id": str(lesson.id),
        "course_id": str(access.course.id),
        "tenant_id": str(access.course.tenant_id),
        "target_path": f"/lesson/{lesson.id}",
        "is_locked": access.is_locked,
        "lock_reason": access.lock_reason,
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
