from fastapi import HTTPException, Depends, Request
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlmodel import select
import uuid
from typing import Optional

from ..db import get_session
from ..models import User, Tenant, TenantMember, MemberRole
from ..routes.auth import get_current_user
from ..utils.logging_config import logger

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
    3. User's primary tenant (fallback)
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
            # For super admins, we might need a default or they must specify
            stmt = select(Tenant.id).limit(1)
            res = await session.exec(stmt)
            tenant_id = res.first()
        return tenant_id

    # Validate membership
    stmt = select(TenantMember).where(
        TenantMember.user_id == current_user.id,
        TenantMember.role.in_([MemberRole.admin, MemberRole.owner, MemberRole.moderator])
    )
    
    if tenant_id:
        stmt = stmt.where(TenantMember.tenant_id == tenant_id)
    
    res = await session.exec(stmt)
    membership = res.first()
    
    if not membership:
        if tenant_id:
            raise HTTPException(status_code=403, detail="Access denied to this school")
        else:
            raise HTTPException(status_code=400, detail="Tenant ID required")
            
    return membership.tenant_id
