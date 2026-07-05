from typing import List, Optional
import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from ..db import get_session
from ..models import PlatformLeadStatus, User
from ..schemas.platform_leads import PlatformLeadRead, PlatformLeadUpdate
from ..services.platform_leads import list_platform_leads, update_platform_lead
from .auth import get_super_user

router = APIRouter()


@router.get("/leads", response_model=List[PlatformLeadRead])
async def list_leads(
    status: Optional[PlatformLeadStatus] = None,
    super_user: User = Depends(get_super_user),
    session: AsyncSession = Depends(get_session),
):
    _ = super_user
    return await list_platform_leads(session, status=status)


@router.patch("/leads/{lead_id}", response_model=PlatformLeadRead)
async def update_lead(
    lead_id: uuid.UUID,
    updates: PlatformLeadUpdate,
    super_user: User = Depends(get_super_user),
    session: AsyncSession = Depends(get_session),
):
    lead = await update_platform_lead(
        session,
        lead_id=lead_id,
        updates=updates,
        handled_by=super_user,
    )
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    return lead
