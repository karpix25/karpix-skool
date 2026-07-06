import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel.ext.asyncio.session import AsyncSession
from pydantic import BaseModel
from typing import Optional
from ..db import get_session
from ..models import MemberRole, MemberStatus, Tenant, TenantMember, User
from ..schemas.setup_tokens import SetupTokenIssueRequest, SetupTokenIssueResponse
from ..schemas.team import TeamMemberCreate, TeamMemberRead, TeamMemberRoleUpdate
from .auth import get_current_user
from ..services.setup_codes import generate_setup_code
from ..services.tenant_access import TENANT_MANAGEMENT_ROLES, ensure_tenant_access
from ..services.tenant_setup_tokens import (
    issue_tenant_setup_token,
    mask_setup_secret,
    setup_command_for_token,
)
from ..services.tenant_stats import get_tenant_stat, get_tenant_stats
from ..services.team_management import (
    add_team_member,
    list_team_members,
    revoke_team_member_role,
    update_team_member_role,
)
from ..services.tenant_links import (
    UnsafeGroupLink,
    normalize_free_group_link,
    normalize_vip_group_link,
    safe_free_group_link_for_response,
    safe_vip_group_link_for_response,
)
from ..utils.logging_config import logger

router = APIRouter(tags=["tenants"])

class TenantCreate(BaseModel):
    name: Optional[str] = None
    level_names: Optional[dict] = None
    free_group_link: Optional[str] = None
    vip_group_link: Optional[str] = None

class TenantRead(BaseModel):
    id: uuid.UUID
    name: str
    setup_code: Optional[str] = None
    setup_code_masked: bool = True
    telegram_group_id: Optional[int] = None
    telegram_group_id_vip: Optional[int] = None
    subscription_status: str = "active"
    member_count: int = 0
    course_count: int = 0
    level_names: Optional[dict] = None
    free_group_link: Optional[str] = None
    vip_group_link: Optional[str] = None


def build_tenant_read(
    tenant: Tenant,
    *,
    member_count: int = 0,
    course_count: int = 0,
) -> TenantRead:
    return TenantRead(
        id=tenant.id,
        name=tenant.name,
        setup_code=mask_setup_secret(tenant.setup_code),
        setup_code_masked=tenant.setup_code is not None,
        telegram_group_id=tenant.telegram_group_id,
        telegram_group_id_vip=tenant.telegram_group_id_vip,
        subscription_status=tenant.subscription_status,
        member_count=member_count,
        course_count=course_count,
        level_names=tenant.level_names,
        free_group_link=safe_free_group_link_for_response(tenant.free_group_link),
        vip_group_link=safe_vip_group_link_for_response(tenant.vip_group_link),
    )


def normalize_group_link_or_422(value: str | None, *, is_free: bool) -> str | None:
    try:
        if is_free:
            return normalize_free_group_link(value)
        return normalize_vip_group_link(value)
    except UnsafeGroupLink as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@router.post("", response_model=TenantRead)
async def create_tenant(
    tenant_in: TenantCreate, 
    current_user: User = Depends(get_current_user), 
    session: AsyncSession = Depends(get_session)
):
    from ..models import UserAdminStatus
    if not current_user.is_super_admin and current_user.admin_status != UserAdminStatus.approved:
        raise HTTPException(status_code=403, detail="You must be an approved author to create a school.")
    
    if not tenant_in.name:
         raise HTTPException(status_code=400, detail="Name is required for creation")

    free_group_link = normalize_group_link_or_422(tenant_in.free_group_link, is_free=True)
    vip_group_link = normalize_group_link_or_422(tenant_in.vip_group_link, is_free=False)

    # 0. Enforce 1-school limit for regular authors
    if not current_user.is_super_admin:
        from sqlmodel import select, func
        stmt_check = select(func.count(Tenant.id)).where(Tenant.owner_user_id == current_user.id)
        existing_count = (await session.exec(stmt_check)).one()
        if existing_count >= 1:
            raise HTTPException(status_code=400, detail="You can only create one school.")
    # 1. Create Tenant
    code = generate_setup_code()
    new_tenant = Tenant(
        name=tenant_in.name,
        owner_user_id=current_user.id,
        subscription_status="active",
        setup_code=code,
        level_names=tenant_in.level_names,
        free_group_link=free_group_link,
        vip_group_link=vip_group_link,
    )
    session.add(new_tenant)
    session.add(TenantMember(
        tenant_id=new_tenant.id,
        user_id=current_user.id,
        role=MemberRole.owner,
        status=MemberStatus.active,
        is_onboarded=True,
    ))
    await session.commit()
    await session.refresh(new_tenant)
    
    # Return response
    return build_tenant_read(new_tenant)

@router.get("", response_model=list[TenantRead])
async def list_my_tenants(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    from sqlmodel import select, or_
    from ..models import TenantMember, MemberStatus
    
    # Select tenants where user is owner OR has an active management membership.
    # Avoid JOIN + DISTINCT because Tenant has JSON columns (level_names) which miss equality operator.
    stmt = (
        select(Tenant)
        .where(
            or_(
                Tenant.owner_user_id == current_user.id,
                Tenant.id.in_(
                    select(TenantMember.tenant_id).where(
                        TenantMember.user_id == current_user.id,
                        TenantMember.status == MemberStatus.active,
                        TenantMember.deleted_at == None,
                        TenantMember.role.in_(TENANT_MANAGEMENT_ROLES)
                    )
                )
            )
        )
    )
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
    
    stats_by_tenant = await get_tenant_stats(session, [tenant.id for tenant in tenants])

    output = []
    for t in tenants:
        logger.info(f"API API: Tenant {t.name} ({t.id}) -> Free: {t.telegram_group_id}, VIP: {t.telegram_group_id_vip}")

        stats = stats_by_tenant[t.id]
        
        output.append(build_tenant_read(
            t,
            member_count=stats.member_count,
            course_count=stats.course_count,
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
        raise HTTPException(status_code=404, detail="Tenant not found")
    
    if updates.name:
        tenant.name = updates.name
        
    if updates.level_names is not None:
        tenant.level_names = updates.level_names

    if updates.free_group_link is not None:
        tenant.free_group_link = normalize_group_link_or_422(updates.free_group_link, is_free=True)

    if updates.vip_group_link is not None:
        tenant.vip_group_link = normalize_group_link_or_422(updates.vip_group_link, is_free=False)
    
    session.add(tenant)
    await session.commit()
    await session.refresh(tenant)
    
    stats = await get_tenant_stat(session, tenant.id)

    return build_tenant_read(
        tenant,
        member_count=stats.member_count,
        course_count=stats.course_count,
    )


@router.post("/{tenant_id}/setup-tokens", response_model=SetupTokenIssueResponse)
async def create_tenant_setup_token(
    tenant_id: uuid.UUID,
    request: SetupTokenIssueRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    tenant = await session.get(Tenant, tenant_id)
    if not tenant or tenant.deleted_at:
        raise HTTPException(status_code=404, detail="Tenant not found")

    await ensure_tenant_access(tenant_id, current_user, session, tenant=tenant)
    issue = await issue_tenant_setup_token(
        session,
        tenant_id=tenant.id,
        scope=request.scope,
        created_by_user_id=current_user.id,
    )
    await session.commit()
    await session.refresh(issue.record)
    return SetupTokenIssueResponse(
        token=issue.token,
        scope=issue.record.scope,
        expires_at=issue.record.expires_at,
        setup_command=setup_command_for_token(issue.token, issue.record.scope),
    )


@router.get("/{tenant_id}/members")
async def list_tenant_members(
    tenant_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    from sqlmodel import select
    from ..models import TenantMember, User # Import strictly what's needed

    tenant = await session.get(Tenant, tenant_id)
    if not tenant:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Tenant not found")

    await ensure_tenant_access(tenant_id, current_user, session, tenant=tenant)

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


@router.get("/{tenant_id}/team", response_model=list[TeamMemberRead])
async def list_tenant_team(
    tenant_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    tenant = await session.get(Tenant, tenant_id)
    if not tenant or tenant.deleted_at:
        raise HTTPException(status_code=404, detail="Tenant not found")

    await ensure_tenant_access(tenant_id, current_user, session, tenant=tenant)
    return await list_team_members(tenant_id, session)


@router.post("/{tenant_id}/team", response_model=TeamMemberRead)
async def create_tenant_team_member(
    tenant_id: uuid.UUID,
    member_in: TeamMemberCreate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    return await add_team_member(
        tenant_id,
        member_in.identifier,
        member_in.role,
        current_user,
        session,
    )


@router.patch("/{tenant_id}/team/{member_id}", response_model=TeamMemberRead)
async def change_tenant_team_member_role(
    tenant_id: uuid.UUID,
    member_id: uuid.UUID,
    updates: TeamMemberRoleUpdate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    return await update_team_member_role(
        tenant_id,
        member_id,
        updates.role,
        current_user,
        session,
    )


@router.delete("/{tenant_id}/team/{member_id}", response_model=TeamMemberRead)
async def revoke_tenant_team_member_role(
    tenant_id: uuid.UUID,
    member_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    return await revoke_team_member_role(tenant_id, member_id, current_user, session)

@router.post("/{tenant_id}/sync")
async def sync_tenant_admins(
    tenant_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    from sqlmodel import select
    # 1. Verify Ownership (or Super Admin)
    stmt = select(Tenant).where(Tenant.id == tenant_id)
    if not current_user.is_super_admin:
        stmt = stmt.where(Tenant.owner_user_id == current_user.id)
        
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
    promoted_names, total = await sync_group_admins(tenant.telegram_group_id, tenant, session)
    
    return {
        "status": "success",
        "total_admins": total,
        "promoted": promoted_names
    }
