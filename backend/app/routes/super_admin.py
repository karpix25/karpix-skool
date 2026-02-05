from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import outerjoin
from typing import List, Optional
import uuid
from pydantic import BaseModel

from ..db import get_session
from ..models import User, Tenant, TenantMember, Course
from .auth import get_current_user, get_super_user

router = APIRouter(tags=["super_admin"])

# --- Schemas ---

class TenantSuperRead(BaseModel):
    id: uuid.UUID
    name: str
    owner_email: Optional[str]
    owner_username: Optional[str]
    owner_telegram_id: Optional[int]
    telegram_group_id: Optional[int]
    setup_code: Optional[str]
    subscription_status: str
    member_count: int
    course_count: int

class TenantUpdate(BaseModel):
    subscription_status: Optional[str] = None
    owner_user_id: Optional[uuid.UUID] = None

class TenantInviteRequest(BaseModel):
    name: str

class TenantInviteResponse(BaseModel):
    id: uuid.UUID
    name: str
    setup_code: str

@router.get("/tenants", response_model=List[TenantSuperRead])
async def list_all_tenants(
    super_user: User = Depends(get_super_user),
    session: AsyncSession = Depends(get_session)
):
    # Left join with User to get owner details (support schools with no owner)
    stmt = select(Tenant, User).outerjoin(User, Tenant.owner_user_id == User.id)
    result = await session.exec(stmt)
    items = result.all()

    output = []
    for tenant, owner in items:
        # Get Member count
        stmt_m = select(func.count()).where(TenantMember.tenant_id == tenant.id)
        res_m = await session.exec(stmt_m)
        m_count = res_m.one()
        
        # Get Course count
        stmt_c = select(func.count()).where(Course.tenant_id == tenant.id)
        res_c = await session.exec(stmt_c)
        c_count = res_c.one()
        
        output.append({
            "id": tenant.id,
            "name": tenant.name,
            "owner_email": owner.email if owner else None,
            "owner_username": owner.username if owner else None,
            "owner_telegram_id": owner.telegram_id if owner else None,
            "telegram_group_id": tenant.telegram_group_id,
            "setup_code": tenant.setup_code,
            "subscription_status": tenant.subscription_status,
            "member_count": m_count,
            "course_count": c_count
        })
    
    return output


@router.patch("/tenants/{tenant_id}")
async def update_tenant(
    tenant_id: uuid.UUID,
    updates: TenantUpdate,
    super_user: User = Depends(get_super_user),
    session: AsyncSession = Depends(get_session)
):
    tenant = await session.get(Tenant, tenant_id)
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    
    # Apply updates
    if updates.subscription_status:
        tenant.subscription_status = updates.subscription_status
    if updates.owner_user_id:
        tenant.owner_user_id = updates.owner_user_id
    
    session.add(tenant)
    await session.commit()
    await session.refresh(tenant)
    
    # Get owner info for response
    owner = await session.get(User, tenant.owner_user_id)
    
    # Simple count fetch
    stmt_m = select(func.count()).where(TenantMember.tenant_id == tenant.id)
    m_count = (await session.exec(stmt_m)).one()
    stmt_c = select(func.count()).where(Course.tenant_id == tenant.id)
    c_count = (await session.exec(stmt_c)).one()

    return {
        "id": tenant.id,
        "name": tenant.name,
        "owner_email": owner.email if owner else None,
        "owner_username": owner.username if owner else None,
        "subscription_status": tenant.subscription_status,
        "member_count": m_count,
        "course_count": c_count
    }

@router.post("/tenants/invite", response_model=TenantInviteResponse)
async def invite_tenant_admin(
    invite_data: TenantInviteRequest,
    super_user: User = Depends(get_super_user),
    session: AsyncSession = Depends(get_session)
):
    import random
    import string
    
    # Create Tenant with no owner
    new_tenant = Tenant(
        name=invite_data.name,
        owner_user_id=None, # No owner yet!
        setup_code=''.join(random.choices(string.ascii_uppercase + string.digits, k=8))
    )
    
    session.add(new_tenant)
    await session.commit()
    await session.refresh(new_tenant)
    
    return new_tenant

@router.delete("/tenants/{tenant_id}")
async def delete_tenant(
    tenant_id: uuid.UUID,
    super_user: User = Depends(get_super_user),
    session: AsyncSession = Depends(get_session)
):
    """
    Delete a tenant and all associated data (cascade).
    Requires super admin privileges.
    """
    # Get tenant
    tenant = await session.get(Tenant, tenant_id)
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    
    # Delete tenant (cascade will handle related records due to model relationships)
    await session.delete(tenant)
    await session.commit()
    
    return {"message": f"Tenant '{tenant.name}' deleted successfully"}
