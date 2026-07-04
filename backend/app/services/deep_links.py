import re
import uuid
from dataclasses import dataclass
from typing import Literal

from fastapi import HTTPException
from sqlmodel.ext.asyncio.session import AsyncSession

from ..config import settings
from ..models import Lesson, User
from .webapp.lesson_access import get_lesson_access_state


StartParamType = Literal["lesson"]

MAX_START_PARAM_LENGTH = 512
LESSON_PREFIX = "lesson_"
START_PARAM_PATTERN = re.compile(r"^[A-Za-z0-9_-]+$")


@dataclass(frozen=True)
class DeepLinkPayload:
    type: StartParamType
    resource_id: uuid.UUID


def build_lesson_start_param(lesson_id: uuid.UUID) -> str:
    return f"{LESSON_PREFIX}{lesson_id}"


def build_mini_app_link(start_param: str) -> str:
    validate_start_param(start_param)
    bot_username = _get_bot_username()
    app_name = settings.APP_SHORT_NAME.strip().strip("/")
    if not app_name:
        raise HTTPException(status_code=500, detail="APP_SHORT_NAME is not configured")
    return f"https://t.me/{bot_username}/{app_name}?startapp={start_param}"


def parse_start_param(start_param: str) -> DeepLinkPayload:
    normalized = validate_start_param(start_param)
    if not normalized.startswith(LESSON_PREFIX):
        raise HTTPException(status_code=400, detail="Unsupported deep link")

    raw_id = normalized.removeprefix(LESSON_PREFIX)
    try:
        resource_id = uuid.UUID(raw_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Invalid lesson deep link") from exc

    return DeepLinkPayload(type="lesson", resource_id=resource_id)


async def resolve_start_param(
    *,
    start_param: str,
    current_user: User,
    session: AsyncSession,
) -> dict:
    payload = parse_start_param(start_param)
    if payload.type == "lesson":
        return await _resolve_lesson_link(payload.resource_id, current_user, session)

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


def _get_bot_username() -> str:
    username = (settings.BOT_USERNAME or "").strip().lstrip("@")
    if not username:
        raise HTTPException(status_code=500, detail="BOT_USERNAME is not configured")
    return username
