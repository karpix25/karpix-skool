from datetime import datetime
from typing import Optional
import uuid

from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from ..models import PlatformLead, PlatformLeadStatus, User
from ..schemas.platform_leads import LeadApply, PlatformLeadUpdate


async def create_platform_lead(session: AsyncSession, data: LeadApply) -> PlatformLead:
    lead = PlatformLead(
        name=data.name.strip(),
        telegram=data.telegram.strip(),
        school_name=data.schoolName.strip(),
        description=data.description.strip(),
    )
    session.add(lead)
    await session.commit()
    await session.refresh(lead)
    return lead


async def list_platform_leads(
    session: AsyncSession,
    *,
    status: Optional[PlatformLeadStatus] = None,
    limit: int = 100,
) -> list[PlatformLead]:
    stmt = select(PlatformLead).where(PlatformLead.deleted_at == None)
    if status:
        stmt = stmt.where(PlatformLead.status == status)
    stmt = stmt.order_by(PlatformLead.created_at.desc()).limit(limit)
    result = await session.exec(stmt)
    return list(result.all())


async def update_platform_lead(
    session: AsyncSession,
    *,
    lead_id: uuid.UUID,
    updates: PlatformLeadUpdate,
    handled_by: User,
) -> Optional[PlatformLead]:
    lead = await session.get(PlatformLead, lead_id)
    if not lead or lead.deleted_at:
        return None

    update_data = updates.model_dump(exclude_unset=True)
    if "status" in update_data and update_data["status"] is not None:
        lead.status = update_data["status"]
        lead.handled_by_user_id = handled_by.id
        lead.handled_at = datetime.utcnow()
    if "admin_note" in update_data:
        lead.admin_note = update_data["admin_note"]

    lead.updated_at = datetime.utcnow()
    session.add(lead)
    await session.commit()
    await session.refresh(lead)
    return lead
