import uuid

from fastapi import HTTPException
from sqlmodel.ext.asyncio.session import AsyncSession

from ..models import Tenant
from .subscriptions import ensure_tenant_ai_entitlement, reserve_ai_job


async def ensure_ai_generation_request(
    session: AsyncSession,
    tenant_id: uuid.UUID,
) -> Tenant:
    tenant = await session.get(Tenant, tenant_id)
    if not tenant or tenant.deleted_at:
        raise HTTPException(status_code=404, detail="Tenant not found")
    await ensure_tenant_ai_entitlement(session, tenant)
    return tenant


async def reserve_ai_generation_execution(
    session: AsyncSession,
    tenant_id: uuid.UUID,
    *,
    operation_key: str,
) -> int:
    tenant = await session.get(Tenant, tenant_id)
    if not tenant or tenant.deleted_at:
        raise HTTPException(status_code=404, detail="Tenant not found")
    return await reserve_ai_job(
        session,
        tenant,
        operation_key=operation_key,
    )
