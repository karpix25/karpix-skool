from datetime import datetime
from typing import Any, Optional
import uuid

from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from ..models import (
    Course,
    Lesson,
    LessonProgress,
    MemberRole,
    Module,
    PlatformLead,
    Tenant,
    TenantMember,
    User,
    UserAdminStatus,
)


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


def _status_tone(status: str) -> str:
    if status in {"approved", "active", "completed", "created"}:
        return "success"
    if status in {"rejected", "blocked", "deleted", "past_due"}:
        return "danger"
    if status in {"pending", "new", "in_progress"}:
        return "warning"
    return "info"


def _to_datetime(value: Any, fallback: datetime) -> datetime:
    if isinstance(value, datetime):
        return value
    if isinstance(value, str) and value:
        try:
            return datetime.fromisoformat(value.replace("Z", "+00:00")).replace(tzinfo=None)
        except ValueError:
            return fallback
    return fallback


def _request_details(user: User) -> dict[str, Any]:
    if isinstance(user.admin_request_details, dict):
        return user.admin_request_details
    return {}


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


async def collect_derived_activity(
    session: AsyncSession,
    limit: int,
    tenant_id: Optional[uuid.UUID],
    event_type: Optional[str],
) -> list[dict[str, Any]]:
    entries: list[dict[str, Any]] = []

    def include(name: str) -> bool:
        return event_type is None or event_type == name

    if include("school.created"):
        entries.extend(await _school_created_events(session, limit, tenant_id))
    if include("student.joined"):
        entries.extend(await _student_joined_events(session, limit, tenant_id))
    if include("lead.created"):
        entries.extend(await _lead_created_events(session, limit))
    if include("lead.status_changed"):
        entries.extend(await _lead_status_events(session, limit))
    if include("author.requested"):
        entries.extend(await _author_request_events(session, limit))
    if include("lesson.completed"):
        entries.extend(await _lesson_completed_events(session, limit, tenant_id))

    return entries


async def _school_created_events(
    session: AsyncSession,
    limit: int,
    tenant_id: Optional[uuid.UUID],
) -> list[dict[str, Any]]:
    stmt = select(Tenant).where(Tenant.deleted_at == None)
    if tenant_id:
        stmt = stmt.where(Tenant.id == tenant_id)
    stmt = stmt.order_by(Tenant.created_at.desc()).limit(limit)
    result = await session.exec(stmt)
    return [
        _entry(
            entry_id=f"school.created:{tenant.id}",
            event_type="school.created",
            occurred_at=tenant.created_at,
            title="Создана школа",
            message=f"Школа {tenant.name} появилась на платформе.",
            tone="success",
            tenant=tenant,
        )
        for tenant in result.all()
    ]


async def _student_joined_events(
    session: AsyncSession,
    limit: int,
    tenant_id: Optional[uuid.UUID],
) -> list[dict[str, Any]]:
    stmt = (
        select(TenantMember, User, Tenant)
        .join(User, TenantMember.user_id == User.id)
        .join(Tenant, TenantMember.tenant_id == Tenant.id)
        .where(
            TenantMember.deleted_at == None,
            TenantMember.role == MemberRole.student,
            Tenant.deleted_at == None,
        )
    )
    if tenant_id:
        stmt = stmt.where(TenantMember.tenant_id == tenant_id)
    stmt = stmt.order_by(TenantMember.joined_at.desc()).limit(limit)
    result = await session.exec(stmt)
    return [
        _entry(
            entry_id=f"student.joined:{member.id}",
            event_type="student.joined",
            occurred_at=member.joined_at,
            title="Новый ученик",
            message=f"{user.username or user.telegram_id or 'Ученик'} присоединился к {tenant.name}.",
            tone="info",
            tenant=tenant,
            actor=user,
        )
        for member, user, tenant in result.all()
    ]


async def _lead_created_events(session: AsyncSession, limit: int) -> list[dict[str, Any]]:
    stmt = (
        select(PlatformLead)
        .where(PlatformLead.deleted_at == None)
        .order_by(PlatformLead.created_at.desc())
        .limit(limit)
    )
    result = await session.exec(stmt)
    return [
        _entry(
            entry_id=f"lead.created:{lead.id}",
            event_type="lead.created",
            occurred_at=lead.created_at,
            title="Новая заявка",
            message=f"{lead.name} оставил заявку на школу {lead.school_name}.",
            tone=_status_tone(lead.status.value),
            meta={"status": lead.status.value, "telegram": lead.telegram},
        )
        for lead in result.all()
    ]


async def _lead_status_events(session: AsyncSession, limit: int) -> list[dict[str, Any]]:
    stmt = (
        select(PlatformLead)
        .where(PlatformLead.deleted_at == None, PlatformLead.handled_at != None)
        .order_by(PlatformLead.handled_at.desc())
        .limit(limit)
    )
    result = await session.exec(stmt)
    return [
        _entry(
            entry_id=f"lead.status_changed:{lead.id}:{lead.status.value}",
            event_type="lead.status_changed",
            occurred_at=lead.handled_at or lead.updated_at,
            title="Статус заявки обновлен",
            message=f"Заявка {lead.school_name} переведена в статус {lead.status.value}.",
            tone=_status_tone(lead.status.value),
            meta={"status": lead.status.value, "telegram": lead.telegram},
        )
        for lead in result.all()
    ]


async def _author_request_events(session: AsyncSession, limit: int) -> list[dict[str, Any]]:
    stmt = (
        select(User)
        .where(
            User.admin_status.in_([
                UserAdminStatus.pending,
                UserAdminStatus.approved,
                UserAdminStatus.rejected,
            ]),
            User.admin_request_details != None,
        )
        .order_by(User.updated_at.desc())
        .limit(limit)
    )
    result = await session.exec(stmt)
    entries = []
    for user in result.all():
        details = _request_details(user)
        occurred_at = _to_datetime(details.get("requested_at"), user.updated_at or user.created_at)
        school_name = details.get("school_name") or "школу без названия"
        entries.append(
            _entry(
                entry_id=f"author.requested:{user.id}",
                event_type="author.requested",
                occurred_at=occurred_at,
                title="Заявка автора",
                message=f"{user.username or user.telegram_id or 'Пользователь'} запросил доступ к {school_name}.",
                tone=_status_tone(user.admin_status.value),
                actor=user,
                meta={"status": user.admin_status.value},
            )
        )
    return entries


async def _lesson_completed_events(
    session: AsyncSession,
    limit: int,
    tenant_id: Optional[uuid.UUID],
) -> list[dict[str, Any]]:
    stmt = (
        select(LessonProgress, User, Lesson, Course, Tenant)
        .join(User, LessonProgress.user_id == User.id)
        .join(Lesson, LessonProgress.lesson_id == Lesson.id)
        .join(Module, Lesson.module_id == Module.id)
        .join(Course, Module.course_id == Course.id)
        .join(Tenant, Course.tenant_id == Tenant.id)
        .where(Course.deleted_at == None, Tenant.deleted_at == None)
    )
    if tenant_id:
        stmt = stmt.where(Course.tenant_id == tenant_id)
    stmt = stmt.order_by(LessonProgress.completed_at.desc()).limit(limit)
    result = await session.exec(stmt)
    return [
        _entry(
            entry_id=f"lesson.completed:{progress.id}",
            event_type="lesson.completed",
            occurred_at=progress.completed_at,
            title="Урок завершен",
            message=f"{user.username or user.telegram_id or 'Ученик'} прошел урок {lesson.title}.",
            tone="success",
            tenant=tenant,
            actor=user,
            meta={"course": course.title},
        )
        for progress, user, lesson, course, tenant in result.all()
    ]
