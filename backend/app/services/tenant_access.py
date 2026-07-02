import uuid
from typing import Optional

from fastapi import HTTPException
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from ..models import MemberRole, MemberStatus, Tenant, TenantMember, User


TENANT_MANAGEMENT_ROLES = (MemberRole.admin, MemberRole.owner, MemberRole.moderator)


async def get_tenant_management_access(
    tenant_id: uuid.UUID,
    user: User,
    session: AsyncSession,
    tenant: Optional[Tenant] = None,
) -> tuple[bool, Optional[TenantMember]]:
    if user.is_super_admin:
        return True, None

    stmt = select(TenantMember).where(
        TenantMember.user_id == user.id,
        TenantMember.tenant_id == tenant_id,
        TenantMember.status == MemberStatus.active,
        TenantMember.deleted_at == None,
        TenantMember.role.in_(TENANT_MANAGEMENT_ROLES),
    )
    res = await session.exec(stmt)
    membership = res.first()
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
            detail="Forbidden: You do not have management access to this school.",
        )
    return membership


async def is_tenant_admin(
    tenant_id: uuid.UUID,
    user: User,
    session: AsyncSession,
) -> bool:
    has_access, _membership = await get_tenant_management_access(tenant_id, user, session)
    return has_access
