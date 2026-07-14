import uuid
from datetime import datetime
from typing import Optional

from fastapi import HTTPException
from sqlmodel import or_, select
from sqlmodel.ext.asyncio.session import AsyncSession

from ..models import MemberRole, MemberRoleSource, MemberStatus, Tenant, TenantMember, User
from .subscriptions import ensure_tenant_write_entitlement


TENANT_MANAGEMENT_ROLES = (MemberRole.admin, MemberRole.owner)
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
    management_tenant_ids = select(TenantMember.tenant_id).where(
        TenantMember.user_id == user.id,
        TenantMember.status == MemberStatus.active,
        TenantMember.deleted_at == None,
        TenantMember.role.in_(TENANT_MANAGEMENT_ROLES),
    )
    statement = (
        select(Tenant.id)
        .where(
            Tenant.deleted_at == None,
            or_(
                Tenant.owner_user_id == user.id,
                Tenant.id.in_(management_tenant_ids),
            ),
        )
        .order_by(Tenant.created_at.asc())
        .limit(2)
    )
    tenant_ids = list((await session.exec(statement)).all())
    if len(tenant_ids) > 1:
        raise HTTPException(
            status_code=409,
            detail="Tenant context is required when managing multiple schools.",
        )
    return tenant_ids[0] if tenant_ids else None


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
    *,
    require_write: bool = False,
) -> Optional[TenantMember]:
    if getattr(user, "is_super_admin", False):
        return None

    if tenant is None:
        tenant = await session.get(Tenant, tenant_id)
    if not tenant or tenant.deleted_at:
        raise HTTPException(status_code=404, detail="Tenant not found")

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

    if require_write:
        await ensure_tenant_write_entitlement(session, tenant)
    return membership


async def is_tenant_admin(
    tenant_id: uuid.UUID,
    user: User,
    session: AsyncSession,
) -> bool:
    has_access, _membership = await get_tenant_management_access(tenant_id, user, session)
    return has_access


async def transfer_tenant_ownership(
    *,
    tenant: Tenant,
    new_owner: User,
    session: AsyncSession,
) -> None:
    """Update the tenant owner and owner memberships atomically on caller commit."""
    previous_owner_id = tenant.owner_user_id
    owner_user_ids = {new_owner.id}
    if previous_owner_id:
        owner_user_ids.add(previous_owner_id)

    result = await session.exec(
        select(TenantMember).where(
            TenantMember.tenant_id == tenant.id,
            TenantMember.user_id.in_(owner_user_ids),
        )
    )
    memberships = {membership.user_id: membership for membership in result.all()}

    if previous_owner_id and previous_owner_id != new_owner.id:
        previous_membership = memberships.get(previous_owner_id)
        if previous_membership and previous_membership.role in TENANT_MANAGEMENT_ROLES:
            previous_membership.role = MemberRole.student
            previous_membership.role_source = MemberRoleSource.system.value
            previous_membership.updated_at = datetime.utcnow()
            session.add(previous_membership)

    new_membership = memberships.get(new_owner.id)
    if new_membership is None:
        new_membership = TenantMember(
            tenant_id=tenant.id,
            user_id=new_owner.id,
            role=MemberRole.owner,
            role_source=MemberRoleSource.system.value,
            status=MemberStatus.active,
            is_onboarded=True,
        )
    else:
        new_membership.role = MemberRole.owner
        new_membership.role_source = MemberRoleSource.system.value
        new_membership.status = MemberStatus.active
        new_membership.paused_at = None
        new_membership.deleted_at = None
        new_membership.updated_at = datetime.utcnow()

    tenant.owner_user_id = new_owner.id
    session.add(new_membership)
    session.add(tenant)
