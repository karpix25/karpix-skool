
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlmodel import select
from app.db import get_session
from app.models import Tenant
import uuid

router = APIRouter()

@router.get("/debug/tenants")
async def list_tenants(session: AsyncSession = Depends(get_session)):
    stmt = select(Tenant)
    result = await session.execute(stmt)
    tenants = result.scalars().all()
    return [{"id": str(t.id), "name": t.name} for t in tenants]

@router.get("/debug/tenant/{tenant_id}")
async def debug_tenant(tenant_id: uuid.UUID, session: AsyncSession = Depends(get_session)):
    tenant = await session.get(Tenant, tenant_id)
    if not tenant:
        return {"error": "Tenant not found"}
        
    return {
        "id": str(tenant.id),
        "name": tenant.name,
        "telegram_group_id": tenant.telegram_group_id,
        "telegram_topic_id": tenant.telegram_topic_id,
        "telegram_group_id_vip": tenant.telegram_group_id_vip,
        "telegram_topic_id_vip": tenant.telegram_topic_id_vip,
        "setup_code": tenant.setup_code
    }
