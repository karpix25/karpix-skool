import uuid
from typing import Any, Optional

from fastapi import Request
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from ...models import Course, CourseUnlockType, Lesson, Module, UnlockType, User
from ...schemas.webapp_levels import (
    WebAppLevelMembership,
    WebAppLevelMilestone,
    WebAppLevelsResponse,
    WebAppLevelUnlock,
)
from ..xp_ledger import LEVEL_THRESHOLDS
from .course_access_context import build_course_list_access_context
from .xp_sources import build_xp_sources


def parse_level_unlock(unlock_type: Any, unlock_value: Any) -> Optional[int]:
    if unlock_type not in ("level_based", UnlockType.level_based, CourseUnlockType.level_based):
        return None

    try:
        required_level = int(str(unlock_value).strip())
    except (TypeError, ValueError):
        return None

    if required_level not in LEVEL_THRESHOLDS:
        return None
    return required_level


def effective_level_unlock(
    own_required_level: int,
    *parent_requirements: tuple[Any, Any],
) -> Optional[int]:
    required_level = own_required_level
    for unlock_type, unlock_value in parent_requirements:
        parent_level = _parent_level_requirement(unlock_type, unlock_value)
        if parent_level is None:
            return None
        required_level = max(required_level, parent_level)

    return required_level if required_level in LEVEL_THRESHOLDS else None


def build_level_milestones(unlocks: list[WebAppLevelUnlock]) -> list[WebAppLevelMilestone]:
    unlocks_by_level: dict[int, list[WebAppLevelUnlock]] = {
        level: [] for level in LEVEL_THRESHOLDS
    }
    for unlock in unlocks:
        unlocks_by_level.setdefault(unlock.required_level, []).append(unlock)

    return [
        WebAppLevelMilestone(
            level=level,
            xp_threshold=xp_threshold,
            unlocks=sorted(
                unlocks_by_level.get(level, []),
                key=lambda item: (
                    item.target_type,
                    item.course_title or item.title,
                    item.module_title or "",
                    item.order_index,
                    item.title,
                ),
            ),
        )
        for level, xp_threshold in sorted(LEVEL_THRESHOLDS.items())
    ]


async def build_webapp_levels_response(
    *,
    session: AsyncSession,
    request: Request,
    current_user: User,
    tenant_id: Optional[uuid.UUID] = None,
) -> WebAppLevelsResponse:
    access_context = await build_course_list_access_context(
        session=session,
        request=request,
        current_user=current_user,
        tenant_id=tenant_id,
    )
    memberships = [
        WebAppLevelMembership(
            tenant_id=membership.tenant_id,
            xp=membership.xp,
            level=membership.level,
        )
        for membership in access_context.membership_by_tenant.values()
        if membership.tenant_id in access_context.tenant_ids
    ]

    if not access_context.tenant_ids:
        return WebAppLevelsResponse(
            milestones=build_level_milestones([]),
            memberships=memberships,
            xp_sources=build_xp_sources(),
        )

    unlocks = []
    unlocks.extend(await _course_unlocks(session, access_context.tenant_ids))
    unlocks.extend(await _module_unlocks(session, access_context.tenant_ids))
    unlocks.extend(await _lesson_unlocks(session, access_context.tenant_ids))
    unlocks = _filter_tenant_unlocks(unlocks, access_context.tenant_ids)

    return WebAppLevelsResponse(
        milestones=build_level_milestones(unlocks),
        memberships=memberships,
        xp_sources=build_xp_sources(),
    )


async def _course_unlocks(
    session: AsyncSession,
    tenant_ids: list[uuid.UUID],
) -> list[WebAppLevelUnlock]:
    result = await session.exec(
        select(
            Course.id.label("course_id"),
            Course.tenant_id.label("tenant_id"),
            Course.title.label("course_title"),
            Course.is_vip.label("is_vip"),
            Course.unlock_type.label("unlock_type"),
            Course.unlock_value.label("unlock_value"),
        ).where(
            Course.tenant_id.in_(tenant_ids),
            Course.is_published == True,
            Course.deleted_at == None,
            Course.unlock_type == CourseUnlockType.level_based,
        )
    )
    return [
        unlock
        for row in result.all()
        if (unlock := _course_unlock_from_row(row)) is not None
    ]


async def _module_unlocks(
    session: AsyncSession,
    tenant_ids: list[uuid.UUID],
) -> list[WebAppLevelUnlock]:
    result = await session.exec(
        select(
            Course.id.label("course_id"),
            Course.tenant_id.label("tenant_id"),
            Course.title.label("course_title"),
            Course.is_vip.label("course_is_vip"),
            Course.unlock_type.label("course_unlock_type"),
            Course.unlock_value.label("course_unlock_value"),
            Module.id.label("module_id"),
            Module.title.label("module_title"),
            Module.is_vip.label("module_is_vip"),
            Module.unlock_type.label("unlock_type"),
            Module.unlock_value.label("unlock_value"),
            Module.order_index.label("order_index"),
        )
        .join(Course, Module.course_id == Course.id)
        .where(
            Course.tenant_id.in_(tenant_ids),
            Course.is_published == True,
            Course.deleted_at == None,
            Module.deleted_at == None,
            Module.unlock_type == UnlockType.level_based,
        )
    )
    return [
        unlock
        for row in result.all()
        if (unlock := _module_unlock_from_row(row)) is not None
    ]


async def _lesson_unlocks(
    session: AsyncSession,
    tenant_ids: list[uuid.UUID],
) -> list[WebAppLevelUnlock]:
    result = await session.exec(
        select(
            Course.id.label("course_id"),
            Course.tenant_id.label("tenant_id"),
            Course.title.label("course_title"),
            Course.is_vip.label("course_is_vip"),
            Course.unlock_type.label("course_unlock_type"),
            Course.unlock_value.label("course_unlock_value"),
            Module.id.label("module_id"),
            Module.title.label("module_title"),
            Module.is_vip.label("module_is_vip"),
            Module.unlock_type.label("module_unlock_type"),
            Module.unlock_value.label("module_unlock_value"),
            Lesson.id.label("lesson_id"),
            Lesson.title.label("lesson_title"),
            Lesson.is_vip.label("lesson_is_vip"),
            Lesson.unlock_type.label("unlock_type"),
            Lesson.unlock_value.label("unlock_value"),
            Lesson.order_index.label("order_index"),
        )
        .join(Module, Lesson.module_id == Module.id)
        .join(Course, Module.course_id == Course.id)
        .where(
            Course.tenant_id.in_(tenant_ids),
            Course.is_published == True,
            Course.deleted_at == None,
            Module.deleted_at == None,
            Lesson.deleted_at == None,
            Lesson.is_published == True,
            Lesson.unlock_type == UnlockType.level_based,
        )
    )
    return [
        unlock
        for row in result.all()
        if (unlock := _lesson_unlock_from_row(row)) is not None
    ]


def _course_unlock_from_row(row: Any) -> Optional[WebAppLevelUnlock]:
    required_level = parse_level_unlock(
        _row_value(row, "unlock_type", 4),
        _row_value(row, "unlock_value", 5),
    )
    if required_level is None:
        return None

    return WebAppLevelUnlock(
        target_type="course",
        tenant_id=_row_value(row, "tenant_id", 1),
        course_id=_row_value(row, "course_id", 0),
        title=_row_value(row, "course_title", 2),
        course_title=_row_value(row, "course_title", 2),
        required_level=required_level,
        xp_threshold=LEVEL_THRESHOLDS[required_level],
        is_vip=bool(_row_value(row, "is_vip", 3)),
    )


def _module_unlock_from_row(row: Any) -> Optional[WebAppLevelUnlock]:
    own_required_level = parse_level_unlock(
        _row_value(row, "unlock_type", 9),
        _row_value(row, "unlock_value", 10),
    )
    if own_required_level is None:
        return None

    required_level = effective_level_unlock(
        own_required_level,
        (
            _row_value(row, "course_unlock_type", 4),
            _row_value(row, "course_unlock_value", 5),
        ),
    )
    if required_level is None:
        return None

    return WebAppLevelUnlock(
        target_type="module",
        tenant_id=_row_value(row, "tenant_id", 1),
        course_id=_row_value(row, "course_id", 0),
        module_id=_row_value(row, "module_id", 6),
        title=_row_value(row, "module_title", 7),
        course_title=_row_value(row, "course_title", 2),
        required_level=required_level,
        xp_threshold=LEVEL_THRESHOLDS[required_level],
        is_vip=bool(_row_value(row, "course_is_vip", 3)) or bool(_row_value(row, "module_is_vip", 8)),
        order_index=_row_value(row, "order_index", 11),
    )


def _lesson_unlock_from_row(row: Any) -> Optional[WebAppLevelUnlock]:
    own_required_level = parse_level_unlock(
        _row_value(row, "unlock_type", 14),
        _row_value(row, "unlock_value", 15),
    )
    if own_required_level is None:
        return None

    required_level = effective_level_unlock(
        own_required_level,
        (
            _row_value(row, "course_unlock_type", 4),
            _row_value(row, "course_unlock_value", 5),
        ),
        (
            _row_value(row, "module_unlock_type", 9),
            _row_value(row, "module_unlock_value", 10),
        ),
    )
    if required_level is None:
        return None

    return WebAppLevelUnlock(
        target_type="lesson",
        tenant_id=_row_value(row, "tenant_id", 1),
        course_id=_row_value(row, "course_id", 0),
        module_id=_row_value(row, "module_id", 6),
        lesson_id=_row_value(row, "lesson_id", 11),
        title=_row_value(row, "lesson_title", 12),
        course_title=_row_value(row, "course_title", 2),
        module_title=_row_value(row, "module_title", 7),
        required_level=required_level,
        xp_threshold=LEVEL_THRESHOLDS[required_level],
        is_vip=(
            bool(_row_value(row, "course_is_vip", 3))
            or bool(_row_value(row, "module_is_vip", 8))
            or bool(_row_value(row, "lesson_is_vip", 13))
        ),
        order_index=_row_value(row, "order_index", 16),
    )


def _parent_level_requirement(unlock_type: Any, unlock_value: Any) -> Optional[int]:
    if unlock_type in (None, "open", "immediate", CourseUnlockType.open, UnlockType.immediate):
        return 0
    if unlock_type in ("level_based", UnlockType.level_based, CourseUnlockType.level_based):
        return parse_level_unlock(unlock_type, unlock_value) or 0
    return None


def _row_value(row: Any, key: str, index: int) -> Any:
    mapping = getattr(row, "_mapping", None)
    if mapping is not None and key in mapping:
        return mapping[key]
    if hasattr(row, key):
        return getattr(row, key)
    try:
        return row[index]
    except (IndexError, KeyError, TypeError):
        return None


def _filter_tenant_unlocks(
    unlocks: list[WebAppLevelUnlock],
    tenant_ids: list[uuid.UUID],
) -> list[WebAppLevelUnlock]:
    allowed_tenant_ids = set(tenant_ids)
    return [unlock for unlock in unlocks if unlock.tenant_id in allowed_tenant_ids]
