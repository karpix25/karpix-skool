import uuid
from datetime import datetime, timedelta
from typing import Optional

from sqlmodel import func, select
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlalchemy.orm import selectinload

from ...models import MemberRole, MemberStatus, Tenant, TenantMember, User, XPEvent
from ...services.tenant_access import ensure_tenant_membership
from .group_membership import has_current_learning_group_access

VISIBLE_LEADERBOARD_LIMIT = 13


def _entry(rank: Optional[int], user: User, xp: int, level: int, current_user: User):
    return {
        "rank": rank,
        "user_id": str(user.id),
        "username": user.username or "Anonymous",
        "avatar_url": user.avatar_url,
        "xp": xp,
        "level": level,
        "is_me": user.id == current_user.id,
    }


async def get_user_tenant_ids(
    session: AsyncSession,
    current_user: User,
    tenant_id: Optional[uuid.UUID],
) -> list[uuid.UUID]:
    if tenant_id:
        if getattr(current_user, "is_super_admin", False):
            return [tenant_id]
        membership = await ensure_tenant_membership(tenant_id, current_user, session)
        tenant = await session.get(Tenant, tenant_id)
        if not membership or not tenant:
            return []
        has_access = await has_current_learning_group_access(
            session=session,
            current_user=current_user,
            tenant=tenant,
            membership=membership,
        )
        return [tenant_id] if has_access else []

    stmt = (
        select(TenantMember)
        .where(
            TenantMember.user_id == current_user.id,
            TenantMember.status == MemberStatus.active,
            TenantMember.deleted_at == None,
        )
        .options(selectinload(TenantMember.tenant))
    )
    res = await session.exec(stmt)
    tenant_ids = []
    for membership in res.all():
        if membership.tenant and await has_current_learning_group_access(
            session=session,
            current_user=current_user,
            tenant=membership.tenant,
            membership=membership,
        ):
            tenant_ids.append(membership.tenant_id)
    return tenant_ids


def _period_since(period: str) -> Optional[datetime]:
    if period == "month":
        return datetime.utcnow() - timedelta(days=30)
    if period == "week":
        return datetime.utcnow() - timedelta(days=7)
    return None


def _row_entry(row, current_user: User):
    return {
        "rank": row.rank,
        "user_id": str(row.user_id),
        "username": row.username or "Anonymous",
        "avatar_url": row.avatar_url,
        "xp": row.xp,
        "level": row.level,
        "is_me": row.user_id == current_user.id,
    }


def _ranked_rows(ranking_query, current_user: User):
    visible = select(*ranking_query.c).where(
        ranking_query.c.rank <= VISIBLE_LEADERBOARD_LIMIT
    ).order_by(ranking_query.c.rank)
    current = select(*ranking_query.c).where(
        ranking_query.c.user_id == current_user.id
    ).order_by(ranking_query.c.rank).limit(1)
    return visible, current


def _all_time_ranking_query(tenant_ids: list[uuid.UUID]):
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
            TenantMember.xp.label("xp"),
            TenantMember.level.label("level"),
        )
        .join(User, TenantMember.user_id == User.id)
        .where(*_active_student_filter(tenant_ids))
        .subquery()
    )


def _period_ranking_query(tenant_ids: list[uuid.UUID], since: datetime):
    period_xp = func.coalesce(func.sum(XPEvent.points), 0)
    grouped = (
        select(
            User.id.label("user_id"),
            User.username,
            User.avatar_url,
            period_xp.label("xp"),
            TenantMember.level.label("level"),
            User.created_at.label("created_at"),
        )
        .join(TenantMember, TenantMember.user_id == User.id)
        .join(
            XPEvent,
            (XPEvent.user_id == User.id) & (XPEvent.tenant_id == TenantMember.tenant_id),
        )
        .where(*_active_student_filter(tenant_ids), XPEvent.created_at >= since)
        .group_by(User.id, TenantMember.level)
        .subquery()
    )
    return (
        select(
            func.row_number().over(
                order_by=(grouped.c.xp.desc(), grouped.c.created_at.asc())
            ).label("rank"),
            grouped.c.user_id,
            grouped.c.username,
            grouped.c.avatar_url,
            grouped.c.xp,
            grouped.c.level,
        )
        .select_from(grouped)
        .subquery()
    )


async def _fetch_ranked_response(
    session: AsyncSession,
    current_user: User,
    ranking_query,
):
    visible_stmt, current_user_stmt = _ranked_rows(ranking_query, current_user)
    visible_res = await session.exec(visible_stmt)
    current_res = await session.exec(current_user_stmt)
    return [
        _row_entry(row, current_user)
        for row in visible_res.all()
    ], current_res.first()


async def _current_user_fallback(
    session: AsyncSession,
    tenant_ids: list[uuid.UUID],
    current_user: User,
):
    stmt = select(TenantMember).where(
        TenantMember.user_id == current_user.id,
        TenantMember.tenant_id.in_(tenant_ids),
        TenantMember.status == MemberStatus.active,
        TenantMember.deleted_at == None,
    )
    res = await session.exec(stmt)
    membership = res.first()
    return _entry(None, current_user, 0, membership.level if membership else 1, current_user)


async def build_leaderboard_response(
    session: AsyncSession,
    current_user: User,
    period: str,
    tenant_id: Optional[uuid.UUID],
):
    tenant_ids = await get_user_tenant_ids(session, current_user, tenant_id)
    if not tenant_ids:
        return {"top_three": [], "others": [], "user_rank": None}

    since = _period_since(period)
    ranking_query = (
        _period_ranking_query(tenant_ids, since)
        if since
        else _all_time_ranking_query(tenant_ids)
    )
    visible_ranking, user_row = await _fetch_ranked_response(session, current_user, ranking_query)
    user_rank = _row_entry(user_row, current_user) if user_row else None
    if user_rank is None:
        user_rank = await _current_user_fallback(session, tenant_ids, current_user)
    return {
        "top_three": visible_ranking[:3],
        "others": visible_ranking[3:],
        "user_rank": user_rank,
    }


def _active_student_filter(tenant_ids: list[uuid.UUID]):
    return (
        TenantMember.tenant_id.in_(tenant_ids),
        TenantMember.role == MemberRole.student,
        TenantMember.status == MemberStatus.active,
        TenantMember.deleted_at == None,
    )
