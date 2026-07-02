import uuid
from typing import Optional

from fastapi import HTTPException
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from ..models import MemberRole, MemberStatus, Tenant, TenantMember, User


TENANT_MANAGEMENT_ROLES = (MemberRole.admin, MemberRole.owner, MemberRole.moderator)
TENANT_ACCESS_DENIED = "Forbidden: You do not have management access to this school."


def _active_member_filters(tenant_id: uuid.UUID, user: User):
    return (
        TenantMember.user_id == user.id,
        TenantMember.tenant_id == tenant_id,
        TenantMember.status == MemberStatus.active,
        TenantMember.deleted_at == None,
    )


async def get_tenant_management_membership(
    tenant_id: uuid.UUID,
    user: User,
    session: AsyncSession,
) -> Optional[TenantMember]:
    stmt = select(TenantMember).where(
        *_active_member_filters(tenant_id, user),
        TenantMember.role.in_(TENANT_MANAGEMENT_ROLES),
    )
    res = await session.exec(stmt)
    return res.first()


async def get_default_tenant_management_tenant_id(
    user: User,
    session: AsyncSession,
) -> Optional[uuid.UUID]:
    stmt = (
        select(TenantMember.tenant_id)
        .where(
            TenantMember.user_id == user.id,
            TenantMember.status == MemberStatus.active,
            TenantMember.deleted_at == None,
            TenantMember.role.in_(TENANT_MANAGEMENT_ROLES),
        )
        .order_by(TenantMember.joined_at.asc())
        .limit(1)
    )
    res = await session.exec(stmt)
    tenant_id = res.first()
    if tenant_id:
        return tenant_id

    owner_stmt = (
        select(Tenant.id)
        .where(
            Tenant.owner_user_id == user.id,
            Tenant.deleted_at == None,
        )
        .order_by(Tenant.created_at.asc())
        .limit(1)
    )
    owner_res = await session.exec(owner_stmt)
    return owner_res.first()


async def ensure_tenant_membership(
    tenant_id: uuid.UUID,
    user: User,
    session: AsyncSession,
) -> Optional[TenantMember]:
    if getattr(user, "is_super_admin", False):
        return None

    stmt = select(TenantMember).where(*_active_member_filters(tenant_id, user))
    res = await session.exec(stmt)
    membership = res.first()
    if not membership:
        raise HTTPException(
            status_code=403,
            detail="Forbidden: You are not a member of this school.",
        )
    return membership


async def get_tenant_management_access(
    tenant_id: uuid.UUID,
    user: User,
    session: AsyncSession,
    tenant: Optional[Tenant] = None,
) -> tuple[bool, Optional[TenantMember]]:
    if getattr(user, "is_super_admin", False):
        return True, None

    membership = await get_tenant_management_membership(tenant_id, user, session)
    if membership:
        return True, membership

    if tenant is None:
        tenant = await session.get(Tenant, tenant_id)
    if tenant and tenant.owner_user_id == user.id:
        return True, None

    return False, None


async def ensure_tenant_access(
    tenant_id: uuid.UUID,
    user: User,
    session: AsyncSession,
    tenant: Optional[Tenant] = None,
) -> Optional[TenantMember]:
    has_access, membership = await get_tenant_management_access(
        tenant_id,
        user,
        session,
        tenant=tenant,
    )

    if not has_access:
        raise HTTPException(
            status_code=403,
            detail=TENANT_ACCESS_DENIED,
        )
    return membership


async def is_tenant_admin(
    tenant_id: uuid.UUID,
    user: User,
    session: AsyncSession,
) -> bool:
    has_access, _membership = await get_tenant_management_access(tenant_id, user, session)
    return has_access
