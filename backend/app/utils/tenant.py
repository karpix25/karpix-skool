import uuid

from fastapi import Depends, HTTPException, Request
from sqlmodel.ext.asyncio.session import AsyncSession

from ..db import get_session
from ..models import Tenant, User
from ..routes.auth import get_current_user
from ..services.tenant_access import ensure_tenant_access, get_default_tenant_management_tenant_id


async def get_active_tenant_id(
    request: Request,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
) -> uuid.UUID:
    """
    Extracts tenant_id from request headers or query params and validates access.
    Priority: 
    1. Header 'X-Tenant-ID'
    2. Query Param 'tenant_id'
    3. User's sole managed tenant (fallback for non-super admins)
    """
    tenant_id_str = request.headers.get("X-Tenant-ID") or request.query_params.get("tenant_id")

    tenant_id = None
    if tenant_id_str:
        try:
            tenant_id = uuid.UUID(tenant_id_str)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid Tenant ID format")

    if current_user.is_super_admin:
        if not tenant_id:
            raise HTTPException(status_code=400, detail="Tenant ID required for super admin operations")
        tenant = await session.get(Tenant, tenant_id)
        if not tenant or tenant.deleted_at:
            raise HTTPException(status_code=404, detail="Tenant not found")
        return tenant_id

    if tenant_id:
        await ensure_tenant_access(tenant_id, current_user, session)
        return tenant_id

    tenant_id = await get_default_tenant_management_tenant_id(current_user, session)
    if not tenant_id:
        raise HTTPException(status_code=400, detail="Tenant ID required")

    return tenant_id
