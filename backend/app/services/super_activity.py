from datetime import datetime
from typing import Any, Iterable, Optional
import uuid

from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from ..models import SuperActivityEvent, Tenant, User
from .super_activity_derived import collect_derived_activity

MAX_ACTIVITY_LIMIT = 100


def _clamp_limit(limit: int) -> int:
    return max(1, min(limit, MAX_ACTIVITY_LIMIT))


def _event_category(event_type: str) -> str:
    if event_type.startswith(("school.", "tenant.")):
        return "school"
    if event_type.startswith("lead."):
        return "lead"
    if event_type.startswith("author."):
        return "author"
    if event_type.startswith("student."):
        return "student"
    if event_type.startswith(("lesson.", "course.")):
        return "learning"
    if event_type.startswith("generation."):
        return "generation"
    return "system"


def _entry(
    *,
    entry_id: str,
    event_type: str,
    occurred_at: datetime,
    title: str,
    message: str,
    tone: str = "info",
    tenant: Optional[Tenant] = None,
    actor: Optional[User] = None,
    meta: Optional[dict[str, Any]] = None,
) -> dict[str, Any]:
    return {
        "id": entry_id,
        "occurred_at": occurred_at,
        "type": _event_category(event_type),
        "event_type": event_type,
        "tone": tone,
        "title": title,
        "message": message,
        "tenant": {"id": tenant.id, "name": tenant.name} if tenant else None,
        "actor": {"id": actor.id, "username": actor.username} if actor else None,
        "meta": meta,
    }


async def record_super_activity(
    session: AsyncSession,
    *,
    event_type: str,
    title: str,
    message: str,
    tone: str = "info",
    actor_user_id: Optional[uuid.UUID] = None,
    tenant_id: Optional[uuid.UUID] = None,
    target_type: Optional[str] = None,
    target_id: Optional[str] = None,
    meta: Optional[dict[str, Any]] = None,
    dedupe_key: Optional[str] = None,
    occurred_at: Optional[datetime] = None,
) -> SuperActivityEvent:
    if dedupe_key:
        result = await session.exec(
            select(SuperActivityEvent).where(SuperActivityEvent.dedupe_key == dedupe_key)
        )
        existing = result.first()
        if existing:
            return existing

    event = SuperActivityEvent(
        event_type=event_type,
        title=title,
        message=message,
        tone=tone,
        actor_user_id=actor_user_id,
        tenant_id=tenant_id,
        target_type=target_type,
        target_id=target_id,
        meta=meta,
        dedupe_key=dedupe_key,
        occurred_at=occurred_at or datetime.utcnow(),
    )
    session.add(event)
    return event


async def list_super_activity(
    session: AsyncSession,
    *,
    limit: int = 30,
    tenant_id: Optional[uuid.UUID] = None,
    event_type: Optional[str] = None,
) -> list[dict[str, Any]]:
    capped_limit = _clamp_limit(limit)
    entries: list[dict[str, Any]] = []
    entries.extend(await _explicit_events(session, capped_limit, tenant_id, event_type))
    entries.extend(await collect_derived_activity(session, capped_limit, tenant_id, event_type))
    entries.sort(key=lambda item: item["occurred_at"], reverse=True)
    return entries[:capped_limit]


async def _explicit_events(
    session: AsyncSession,
    limit: int,
    tenant_id: Optional[uuid.UUID],
    event_type: Optional[str],
) -> list[dict[str, Any]]:
    stmt = select(SuperActivityEvent)
    if tenant_id:
        stmt = stmt.where(SuperActivityEvent.tenant_id == tenant_id)
    if event_type:
        stmt = stmt.where(SuperActivityEvent.event_type == event_type)
    stmt = stmt.order_by(SuperActivityEvent.occurred_at.desc()).limit(limit)
    result = await session.exec(stmt)
    events = list(result.all())

    tenants = await _tenant_map(session, (event.tenant_id for event in events if event.tenant_id))
    actors = await _user_map(session, (event.actor_user_id for event in events if event.actor_user_id))

    return [
        _entry(
            entry_id=f"audit:{event.id}",
            event_type=event.event_type,
            occurred_at=event.occurred_at,
            title=event.title,
            message=event.message,
            tone=event.tone,
            tenant=tenants.get(event.tenant_id),
            actor=actors.get(event.actor_user_id),
            meta=event.meta,
        )
        for event in events
    ]


async def _tenant_map(session: AsyncSession, ids: Iterable[uuid.UUID]) -> dict[uuid.UUID, Tenant]:
    id_list = list({item for item in ids if item})
    if not id_list:
        return {}
    result = await session.exec(select(Tenant).where(Tenant.id.in_(id_list)))
    return {tenant.id: tenant for tenant in result.all()}


async def _user_map(session: AsyncSession, ids: Iterable[uuid.UUID]) -> dict[uuid.UUID, User]:
    id_list = list({item for item in ids if item})
    if not id_list:
        return {}
    result = await session.exec(select(User).where(User.id.in_(id_list)))
    return {user.id: user for user in result.all()}
