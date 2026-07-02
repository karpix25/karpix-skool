from fastapi import APIRouter, Depends, HTTPException
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlmodel import select
from app.db import get_session
from app.models import Tenant, User
from app.routes.auth import get_super_user
from app.config import settings
from app.services.tenant_setup_tokens import mask_setup_secret
import uuid


def ensure_debug_routes_enabled():
    if settings.ENVIRONMENT == "production":
        raise HTTPException(status_code=404, detail="Not found")


router = APIRouter(dependencies=[Depends(ensure_debug_routes_enabled)])

@router.get("/tenants")
async def list_tenants(
    super_user: User = Depends(get_super_user),
    session: AsyncSession = Depends(get_session)
):
    stmt = select(Tenant)
    result = await session.execute(stmt)
    tenants = result.scalars().all()
    return [{"id": str(t.id), "name": t.name} for t in tenants]

@router.get("/tenant/{tenant_id}")
async def debug_tenant(
    tenant_id: uuid.UUID,
    super_user: User = Depends(get_super_user),
    session: AsyncSession = Depends(get_session)
):
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
        "setup_code": mask_setup_secret(tenant.setup_code),
        "setup_code_masked": tenant.setup_code is not None,
    }
