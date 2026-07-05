from typing import Iterable, Optional

from sqlmodel.ext.asyncio.session import AsyncSession

from ...models import Tenant, TenantMember, User
from .group_membership import has_current_learning_group_access, tenant_has_learning_group


async def filter_verified_memberships(
    *,
    session: AsyncSession,
    current_user: User,
    memberships: Iterable[TenantMember],
) -> list[TenantMember]:
    verified = []
    for membership in memberships:
        if not membership.tenant:
            continue
        if await has_current_learning_group_access(
            session=session,
            current_user=current_user,
            tenant=membership.tenant,
            membership=membership,
        ):
            verified.append(membership)
    return verified


def profile_access_status(
    *,
    requested_tenant_explicitly: bool,
    explicit_tenant: Optional[Tenant],
    active_membership: Optional[TenantMember],
) -> str:
    if active_membership:
        return "active"
    if requested_tenant_explicitly and explicit_tenant and tenant_has_learning_group(explicit_tenant):
        return "group_required"
    if requested_tenant_explicitly and explicit_tenant:
        return "membership_required"
    return "no_membership"
