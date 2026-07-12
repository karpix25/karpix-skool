from datetime import datetime
from typing import Any, Optional

from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from ..models import PlatformLead, User, UserAdminStatus


AUTHOR_STATUSES = [
    UserAdminStatus.pending,
    UserAdminStatus.approved,
    UserAdminStatus.rejected,
]


def _request_details(user: User) -> dict[str, Any]:
    if isinstance(user.admin_request_details, dict):
        return user.admin_request_details
    return {}


def _request_created_at(user: User) -> datetime:
    details = _request_details(user)
    requested_at = details.get("requested_at")
    if isinstance(requested_at, datetime):
        return requested_at
    if isinstance(requested_at, str):
        try:
            return datetime.fromisoformat(requested_at.replace("Z", "+00:00")).replace(tzinfo=None)
        except ValueError:
            pass
    return user.updated_at or user.created_at


def _telegram_label(user: User) -> Optional[str]:
    if user.username:
        return user.username if user.username.startswith("@") else f"@{user.username}"
    if user.telegram_id:
        return str(user.telegram_id)
    return None


async def list_super_applications(session: AsyncSession) -> list[dict[str, Any]]:
    lead_result = await session.exec(
        select(PlatformLead)
        .where(PlatformLead.deleted_at == None)
        .order_by(PlatformLead.created_at.desc())
        .limit(200)
    )
    user_result = await session.exec(
        select(User)
        .where(
            User.admin_status.in_(AUTHOR_STATUSES),
            User.admin_request_details != None,
            User.deleted_at == None,
        )
        .order_by(User.updated_at.desc())
        .limit(200)
    )

    applications = [_lead_application(lead) for lead in lead_result.all()]
    applications.extend(_author_application(user) for user in user_result.all())
    applications.sort(key=lambda item: item["createdAt"] or datetime.min, reverse=True)
    return applications


def _lead_application(lead: PlatformLead) -> dict[str, Any]:
    return {
        "id": f"lead:{lead.id}",
        "kind": "platform_lead",
        "name": lead.name,
        "telegram": lead.telegram,
        "schoolName": lead.school_name,
        "description": lead.description,
        "status": lead.status.value,
        "createdAt": lead.created_at,
        "source": "Форма сайта",
        "leadId": lead.id,
        "userId": None,
    }


def _author_application(user: User) -> dict[str, Any]:
    details = _request_details(user)
    return {
        "id": f"author:{user.id}",
        "kind": "author_request",
        "name": user.username,
        "telegram": _telegram_label(user),
        "schoolName": details.get("school_name"),
        "description": details.get("details"),
        "status": user.admin_status.value,
        "createdAt": _request_created_at(user),
        "source": "Mini App",
        "leadId": None,
        "userId": user.id,
    }
