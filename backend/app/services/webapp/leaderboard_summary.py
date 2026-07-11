from datetime import datetime, timedelta
from typing import Any, Optional
import uuid

from sqlmodel import func, select
from sqlmodel.ext.asyncio.session import AsyncSession

from ...models import MemberRole, MemberStatus, Tenant, TenantMember, User, XPEvent
from ...schemas.webapp_leaderboard import (
    LeaderboardPeriodKey,
    WebAppLeaderboardCurrentUser,
    WebAppLeaderboardEntry,
    WebAppLeaderboardLevel,
    WebAppLeaderboardPeriod,
    WebAppLeaderboardSection,
    WebAppLeaderboardSummaryResponse,
)
from ..xp_ledger import LEVEL_THRESHOLDS, level_for_xp
from .leaderboard import VISIBLE_LEADERBOARD_LIMIT, get_user_tenant_ids

SUMMARY_PERIODS: tuple[LeaderboardPeriodKey, ...] = ("week", "month", "all")
SUMMARY_PERIOD_LABELS: dict[LeaderboardPeriodKey, str] = {
    "week": "7 дней",
    "month": "30 дней",
    "all": "Все время",
}


async def build_leaderboard_summary_response(
    session: AsyncSession,
    current_user: User,
    tenant_id: Optional[uuid.UUID],
) -> WebAppLeaderboardSummaryResponse:
    generated_at = datetime.utcnow()
    tenant_ids = await get_user_tenant_ids(session, current_user, tenant_id)
    if not tenant_ids:
        return WebAppLeaderboardSummaryResponse(
            generated_at=generated_at,
            last_updated_at=None,
            total_participants=0,
            current_user=_current_user_payload(current_user, None, 0, None, 1),
            levels=_build_level_distribution({}, 0, {}),
            leaderboards=_summary_sections(generated_at, {}),
        )

    level_names = await _fetch_level_names(session, tenant_ids)
    total_participants = await _fetch_total_participants(session, tenant_ids)
    last_updated_at = await _fetch_last_updated_at(session, tenant_ids)
    level_counts = await _fetch_level_counts(session, tenant_ids)

    items_by_period: dict[LeaderboardPeriodKey, list[WebAppLeaderboardEntry]] = {}
    for key in SUMMARY_PERIODS:
        since = _summary_period_since(key, generated_at)
        ranking_query = (
            _summary_period_ranking_query(tenant_ids, since)
            if since
            else _summary_all_time_ranking_query(tenant_ids)
        )
        items_by_period[key] = await _summary_visible_entries(
            session,
            current_user,
            ranking_query,
            key,
        )

    return WebAppLeaderboardSummaryResponse(
        generated_at=generated_at,
        last_updated_at=last_updated_at,
        total_participants=total_participants,
        current_user=await _summary_current_user(session, current_user, tenant_ids),
        levels=_build_level_distribution(level_counts, total_participants, level_names),
        leaderboards=_summary_sections(generated_at, items_by_period),
    )


async def _fetch_total_participants(
    session: AsyncSession,
    tenant_ids: list[uuid.UUID],
) -> int:
    result = await session.exec(
        select(func.count(TenantMember.id)).where(*_active_student_filter(tenant_ids))
    )
    return int(_scalar_value(result.first()) or 0)


async def _fetch_last_updated_at(
    session: AsyncSession,
    tenant_ids: list[uuid.UUID],
) -> Optional[datetime]:
    result = await session.exec(
        select(func.max(XPEvent.created_at)).where(XPEvent.tenant_id.in_(tenant_ids))
    )
    value = _scalar_value(result.first())
    return value if isinstance(value, datetime) else None


async def _fetch_level_counts(
    session: AsyncSession,
    tenant_ids: list[uuid.UUID],
) -> dict[int, int]:
    result = await session.exec(
        select(
            TenantMember.level.label("level"),
            func.count(TenantMember.id).label("member_count"),
        )
        .where(*_active_student_filter(tenant_ids))
        .group_by(TenantMember.level)
    )
    return {
        int(_row_value(row, "level", 0)): int(_row_value(row, "member_count", 1) or 0)
        for row in result.all()
    }


async def _fetch_level_names(
    session: AsyncSession,
    tenant_ids: list[uuid.UUID],
) -> dict[int, str]:
    result = await session.exec(
        select(Tenant.level_names)
        .where(Tenant.id.in_(tenant_ids), Tenant.deleted_at == None)
        .order_by(Tenant.created_at.asc())
    )
    names_by_level: dict[int, str] = {}
    for row in result.all():
        level_names = _scalar_value(row)
        if not isinstance(level_names, dict):
            continue
        for level_key, name in level_names.items():
            try:
                level = int(level_key)
            except (TypeError, ValueError):
                continue
            if level in LEVEL_THRESHOLDS and isinstance(name, str) and name.strip():
                names_by_level.setdefault(level, name.strip())
    return names_by_level


def _summary_sections(
    generated_at: datetime,
    items_by_period: dict[LeaderboardPeriodKey, list[WebAppLeaderboardEntry]],
) -> dict[LeaderboardPeriodKey, WebAppLeaderboardSection]:
    return {
        key: WebAppLeaderboardSection(
            period=_period_metadata(key, generated_at),
            items=items_by_period.get(key, []),
        )
        for key in SUMMARY_PERIODS
    }


async def _summary_visible_entries(
    session: AsyncSession,
    current_user: User,
    ranking_query,
    period_key: LeaderboardPeriodKey,
) -> list[WebAppLeaderboardEntry]:
    stmt = (
        select(*ranking_query.c)
        .where(ranking_query.c.rank <= VISIBLE_LEADERBOARD_LIMIT)
        .order_by(ranking_query.c.rank)
    )
    result = await session.exec(stmt)
    return [_summary_entry(row, current_user, period_key) for row in result.all()]


async def _summary_current_user(
    session: AsyncSession,
    current_user: User,
    tenant_ids: list[uuid.UUID],
) -> WebAppLeaderboardCurrentUser:
    ranking_query = _summary_all_time_ranking_query(tenant_ids)
    result = await session.exec(
        select(*ranking_query.c)
        .where(ranking_query.c.user_id == current_user.id)
        .order_by(ranking_query.c.rank)
        .limit(1)
    )
    row = result.first()
    if row:
        return _current_user_from_ranking(row, current_user)

    result = await session.exec(
        select(TenantMember)
        .where(
            TenantMember.user_id == current_user.id,
            TenantMember.tenant_id.in_(tenant_ids),
            TenantMember.status == MemberStatus.active,
            TenantMember.deleted_at == None,
        )
        .order_by(TenantMember.joined_at.asc())
        .limit(1)
    )
    fallback = result.first()
    return _current_user_payload(
        current_user,
        None,
        fallback.xp if fallback else 0,
        None,
        fallback.level if fallback else 1,
    )


def _build_level_distribution(
    level_counts: dict[int, int],
    total_participants: int,
    level_names: dict[int, str],
) -> list[WebAppLeaderboardLevel]:
    return [
        WebAppLeaderboardLevel(
            level=level,
            name=level_names.get(level),
            xp_threshold=xp_threshold,
            member_count=level_counts.get(level, 0),
            member_percent=_member_percent(level_counts.get(level, 0), total_participants),
        )
        for level, xp_threshold in sorted(LEVEL_THRESHOLDS.items())
    ]


def _summary_all_time_ranking_query(tenant_ids: list[uuid.UUID]):
    ranking_order = (
        TenantMember.xp.desc(),
        TenantMember.level.desc(),
        User.created_at.asc(),
    )
    return (
        select(
            func.row_number().over(order_by=ranking_order).label("rank"),
            User.id.label("user_id"),
            User.username,
            User.avatar_url,
            TenantMember.xp.label("xp_total"),
            TenantMember.level.label("level"),
        )
        .join(User, TenantMember.user_id == User.id)
        .where(*_active_student_filter(tenant_ids))
        .subquery()
    )


def _summary_period_ranking_query(tenant_ids: list[uuid.UUID], since: datetime):
    period_xp = func.coalesce(func.sum(XPEvent.points), 0)
    grouped = (
        select(
            User.id.label("user_id"),
            User.username,
            User.avatar_url,
            TenantMember.xp.label("xp_total"),
            period_xp.label("xp_period"),
            TenantMember.level.label("level"),
            User.created_at.label("created_at"),
        )
        .join(TenantMember, TenantMember.user_id == User.id)
        .join(
            XPEvent,
            (XPEvent.user_id == User.id)
            & (XPEvent.tenant_id == TenantMember.tenant_id),
        )
        .where(*_active_student_filter(tenant_ids), XPEvent.created_at >= since)
        .group_by(
            TenantMember.id,
            User.id,
            User.username,
            User.avatar_url,
            TenantMember.xp,
            TenantMember.level,
            User.created_at,
        )
        .subquery()
    )
    return (
        select(
            func.row_number()
            .over(order_by=(grouped.c.xp_period.desc(), grouped.c.created_at.asc()))
            .label("rank"),
            grouped.c.user_id,
            grouped.c.username,
            grouped.c.avatar_url,
            grouped.c.xp_total,
            grouped.c.xp_period,
            grouped.c.level,
        )
        .select_from(grouped)
        .subquery()
    )


def _summary_entry(
    row: Any,
    current_user: User,
    period_key: LeaderboardPeriodKey,
) -> WebAppLeaderboardEntry:
    return WebAppLeaderboardEntry(
        rank=int(_row_value(row, "rank", 0) or 0),
        user_id=_row_value(row, "user_id", 1),
        username=_row_value(row, "username", 2) or "Anonymous",
        avatar_url=_row_value(row, "avatar_url", 3),
        xp_total=int(_row_value(row, "xp_total", 4) or 0),
        xp_period=(
            None
            if period_key == "all"
            else int(_row_value(row, "xp_period", 5) or 0)
        ),
        level=int(_row_value(row, "level", 6 if period_key != "all" else 5) or 1),
        is_me=_row_value(row, "user_id", 1) == current_user.id,
    )


def _current_user_from_ranking(
    row: Any,
    current_user: User,
) -> WebAppLeaderboardCurrentUser:
    return _current_user_payload(
        current_user,
        int(_row_value(row, "rank", 0) or 0),
        int(_row_value(row, "xp_total", 4) or 0),
        None,
        int(_row_value(row, "level", 5) or 1),
    )


def _current_user_payload(
    current_user: User,
    rank: Optional[int],
    xp_total: int,
    xp_period: Optional[int],
    level: int,
) -> WebAppLeaderboardCurrentUser:
    level = _known_level(level, xp_total)
    next_level, xp_to_next_level, progress_percent = _level_progress(level, xp_total)
    return WebAppLeaderboardCurrentUser(
        rank=rank,
        user_id=current_user.id,
        username=current_user.username or "Anonymous",
        avatar_url=current_user.avatar_url,
        xp_total=xp_total,
        xp_period=xp_period,
        level=level,
        next_level=next_level,
        xp_to_next_level=xp_to_next_level,
        progress_percent=progress_percent,
        is_me=True,
    )


def _level_progress(level: int, xp_total: int) -> tuple[Optional[int], int, float]:
    max_level = max(LEVEL_THRESHOLDS)
    if level >= max_level:
        return None, 0, 100.0

    next_level = level + 1
    current_threshold = LEVEL_THRESHOLDS[level]
    next_threshold = LEVEL_THRESHOLDS[next_level]
    span = max(next_threshold - current_threshold, 1)
    earned = min(max(xp_total - current_threshold, 0), span)
    return next_level, max(next_threshold - xp_total, 0), round((earned / span) * 100, 1)


def _known_level(level: int, xp_total: int) -> int:
    return level if level in LEVEL_THRESHOLDS else level_for_xp(xp_total)


def _member_percent(member_count: int, total_participants: int) -> float:
    if total_participants <= 0:
        return 0.0
    return round((member_count / total_participants) * 100, 1)


def _period_metadata(
    key: LeaderboardPeriodKey,
    generated_at: datetime,
) -> WebAppLeaderboardPeriod:
    return WebAppLeaderboardPeriod(
        key=key,
        label=SUMMARY_PERIOD_LABELS[key],
        starts_at=_summary_period_since(key, generated_at),
        ends_at=generated_at,
        mode="all_time" if key == "all" else "rolling",
    )


def _summary_period_since(
    key: LeaderboardPeriodKey,
    generated_at: datetime,
) -> Optional[datetime]:
    days = {"week": 7, "month": 30}.get(key)
    return generated_at - timedelta(days=days) if days else None


def _active_student_filter(tenant_ids: list[uuid.UUID]):
    return (
        TenantMember.tenant_id.in_(tenant_ids),
        TenantMember.role == MemberRole.student,
        TenantMember.status == MemberStatus.active,
        TenantMember.deleted_at == None,
    )


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


def _scalar_value(row: Any) -> Any:
    mapping = getattr(row, "_mapping", None)
    if mapping is not None:
        return next(iter(mapping.values()), None)
    if isinstance(row, tuple):
        return row[0] if row else None
    return row
