import random
import string
import uuid
from fastapi import APIRouter, Depends
from sqlmodel.ext.asyncio.session import AsyncSession
from pydantic import BaseModel
from typing import Optional
from ..db import get_session
from ..models import Tenant, User
from .auth import get_current_user
from ..utils.logging_config import logger

router = APIRouter(tags=["tenants"])

class TenantCreate(BaseModel):
    name: Optional[str] = None
    level_names: Optional[dict] = None

class TenantRead(BaseModel):
    id: uuid.UUID
    name: str
    setup_code: Optional[str] = None
    telegram_group_id: Optional[int] = None
    telegram_group_id_vip: Optional[int] = None
    subscription_status: str = "active"
    member_count: int = 0
    course_count: int = 0
    level_names: Optional[dict] = None

def generate_setup_code() -> str:
    # START-123 format or similar
    suffix = ''.join(random.choices(string.ascii_uppercase + string.digits, k=5))
    return f"START-{suffix}"

@router.post("", response_model=TenantRead)
async def create_tenant(
    tenant_in: TenantCreate, 
    current_user: User = Depends(get_current_user), 
    session: AsyncSession = Depends(get_session)
):
    from ..models import UserAdminStatus
    if not current_user.is_super_admin and current_user.admin_status != UserAdminStatus.approved:
        from fastapi import HTTPException
        raise HTTPException(status_code=403, detail="You must be an approved author to create a school.")
    
    if not tenant_in.name:
         from fastapi import HTTPException
         raise HTTPException(status_code=400, detail="Name is required for creation")

    # 0. Enforce 1-school limit for regular authors
    if not current_user.is_super_admin:
        from sqlmodel import select, func
        stmt_check = select(func.count(Tenant.id)).where(Tenant.owner_user_id == current_user.id)
        existing_count = (await session.exec(stmt_check)).one()
        if existing_count >= 1:
            from fastapi import HTTPException
            raise HTTPException(status_code=400, detail="You can only create one school.")
    # 1. Create Tenant
    code = generate_setup_code()
    new_tenant = Tenant(
        name=tenant_in.name,
        owner_user_id=current_user.id,
        subscription_status="active",
        setup_code=code,
        level_names=tenant_in.level_names
    )
    session.add(new_tenant)
    await session.commit()
    await session.refresh(new_tenant)
    
    # Return response
    return TenantRead(
        id=new_tenant.id, 
        name=new_tenant.name, 
        setup_code=new_tenant.setup_code, 
        telegram_group_id=new_tenant.telegram_group_id,
        telegram_group_id_vip=new_tenant.telegram_group_id_vip,
        subscription_status=new_tenant.subscription_status,
        level_names=new_tenant.level_names
    )

@router.get("", response_model=list[TenantRead])
async def list_my_tenants(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    from sqlmodel import select
    stmt = select(Tenant).where(Tenant.owner_user_id == current_user.id)
    result = await session.exec(stmt)
    tenants = result.all()
    
    # Ensure existing tenants have codes (for migration/MVP)
    updated = False
    for t in tenants:
        if not t.setup_code:
            t.setup_code = generate_setup_code()
            session.add(t)
            updated = True
            
    if updated:
        await session.commit()
    
    from sqlmodel import func
    from ..models import TenantMember, Course
    
    output = []
    for t in tenants:
        # Get Member count
        stmt_m = select(func.count()).where(TenantMember.tenant_id == t.id)
        res_m = await session.exec(stmt_m)
        m_count = res_m.one()
        
        # Get Course count
        stmt_c = select(func.count()).where(Course.tenant_id == t.id)
        res_c = await session.exec(stmt_c)
        c_count = res_c.one()
        
        logger.info(f"API API: Tenant {t.name} ({t.id}) -> Free: {t.telegram_group_id}, VIP: {t.telegram_group_id_vip}")

        
        output.append(TenantRead(
            id=t.id, 
            name=t.name, 
            setup_code=t.setup_code,
            subscription_status=t.subscription_status,
            member_count=m_count,
            course_count=c_count,
            level_names=t.level_names
        ))
    
    return output

@router.patch("/{tenant_id}", response_model=TenantRead)
async def update_tenant(
    tenant_id: uuid.UUID,
    updates: TenantCreate, # Reuse TenantCreate for name update
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    from sqlmodel import select
    # Verify ownership
    stmt = select(Tenant).where(Tenant.id == tenant_id, Tenant.owner_user_id == current_user.id)
    res = await session.exec(stmt)
    tenant = res.first()
    
    if not tenant:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Tenant not found")
    
    if updates.name:
        tenant.name = updates.name
        
    if updates.level_names is not None:
        tenant.level_names = updates.level_names
    
    session.add(tenant)
    await session.commit()
    await session.refresh(tenant)
    
    # Simple count fetch
    from sqlmodel import func
    from ..models import TenantMember, Course
    stmt_m = select(func.count()).where(TenantMember.tenant_id == tenant.id)
    m_count = (await session.exec(stmt_m)).one()
    stmt_c = select(func.count()).where(Course.tenant_id == tenant.id)
    c_count = (await session.exec(stmt_c)).one()

    return TenantRead(
        id=tenant.id,
        name=tenant.name,
        setup_code=tenant.setup_code,
        subscription_status=tenant.subscription_status,
        member_count=m_count,
        course_count=c_count
    )

@router.get("/{tenant_id}/members")
async def list_tenant_members(
    tenant_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    from sqlmodel import select
    from ..models import TenantMember, User # Import strictly what's needed
    
    # Verify ownership
    stmt = select(Tenant).where(Tenant.id == tenant_id, Tenant.owner_user_id == current_user.id)
    res = await session.exec(stmt)
    tenant = res.first()
    if not tenant:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Tenant not found")

    # Fetch members with user info
    # We'll do a join or just return raw member data for now.
    # Joining with User is better to see usernames.
    stmt = select(TenantMember, User).where(TenantMember.tenant_id == tenant_id).join(User, TenantMember.user_id == User.id)
    result = await session.exec(stmt)
    members_data = result.all()
    
    output = []
    for member, user in members_data:
        output.append({
            "id": member.id,
            "user_id": user.id,
            "username": user.username,
            "avatar_url": user.avatar_url,
            "xp": member.xp,
            "level": member.level,
            "joined_at": member.joined_at,
            "role": member.role
        })
    
    return output

@router.post("/{tenant_id}/sync")
async def sync_tenant_admins(
    tenant_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    from sqlmodel import select
    # 1. Verify Ownership
    stmt = select(Tenant).where(Tenant.id == tenant_id, Tenant.owner_user_id == current_user.id)
    res = await session.exec(stmt)
    tenant = res.first()
    
    if not tenant:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Tenant not found")
        
    if not tenant.telegram_group_id:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="School is not connected to a Telegram group.")
        
    # 2. Call Sync Service
    from ..services.telegram import sync_group_admins
    promoted, total = await sync_group_admins(tenant.telegram_group_id, tenant, session)
    
    return {
        "status": "success",
        "total_admins": total,
        "promoted": promoted
    }
