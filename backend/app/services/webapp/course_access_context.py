import uuid
from dataclasses import dataclass
from datetime import datetime
from typing import Optional

from fastapi import HTTPException, Request
from sqlalchemy import or_
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from ...models import Course, MemberStatus, Tenant, TenantMember, User
from .access import (
    ensure_active_membership,
    ensure_active_subscription,
    is_tenant_admin_member,
)
from .group_membership import (
    ensure_current_learning_group_access,
    has_current_learning_group_access,
)


@dataclass(frozen=True)
class CourseListAccessContext:
    tenant_ids: list[uuid.UUID]
    active_tenants: dict[uuid.UUID, Tenant]
    membership_by_tenant: dict[uuid.UUID, TenantMember]
    is_super_admin_preview: bool = False


@dataclass(frozen=True)
class CourseDetailAccessContext:
    tenant: Tenant
    membership: Optional[TenantMember]
    is_admin: bool


def get_requested_tenant_id(
    request: Request,
    tenant_id: Optional[uuid.UUID] = None,
) -> Optional[uuid.UUID]:
    if tenant_id:
        return tenant_id

    tenant_id_str = request.headers.get("X-Tenant-ID")
    if not tenant_id_str:
        return None

    try:
        return uuid.UUID(tenant_id_str)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid Tenant ID format")


async def build_course_list_access_context(
    *,
    session: AsyncSession,
    request: Request,
    current_user: User,
    tenant_id: Optional[uuid.UUID] = None,
) -> CourseListAccessContext:
    requested_tenant_id = get_requested_tenant_id(request, tenant_id)

    if current_user.is_super_admin:
        if not requested_tenant_id:
            return CourseListAccessContext([], {}, {}, is_super_admin_preview=True)

        tenant = await ensure_active_subscription(requested_tenant_id, session)
        return CourseListAccessContext(
            tenant_ids=[tenant.id],
            active_tenants={tenant.id: tenant},
            membership_by_tenant={},
            is_super_admin_preview=True,
        )

    stmt_m = select(TenantMember).where(
        TenantMember.user_id == current_user.id,
        TenantMember.status == MemberStatus.active,
        TenantMember.deleted_at == None,
    )
    if requested_tenant_id:
        stmt_m = stmt_m.where(TenantMember.tenant_id == requested_tenant_id)

    res_m = await session.exec(stmt_m)
    memberships = res_m.all()
    if not memberships:
        return CourseListAccessContext([], {}, {})

    active_tenants = await _get_active_tenants(
        session,
        [membership.tenant_id for membership in memberships],
    )
    tenant_ids = []
    for membership in memberships:
        tenant = active_tenants.get(membership.tenant_id)
        if not tenant:
            continue

        if await has_current_learning_group_access(
            session=session,
            current_user=current_user,
            tenant=tenant,
            membership=membership,
        ):
            tenant_ids.append(membership.tenant_id)

    return CourseListAccessContext(
        tenant_ids=tenant_ids,
        active_tenants=active_tenants,
        membership_by_tenant={membership.tenant_id: membership for membership in memberships},
    )


async def build_course_detail_access_context(
    *,
    session: AsyncSession,
    request: Request,
    current_user: User,
    course: Course,
) -> CourseDetailAccessContext:
    requested_tenant_id = get_requested_tenant_id(request)
    if requested_tenant_id and requested_tenant_id != course.tenant_id:
        raise HTTPException(status_code=404, detail="Course not found")

    tenant = await ensure_active_subscription(course.tenant_id, session)

    if current_user.is_super_admin:
        return CourseDetailAccessContext(tenant=tenant, membership=None, is_admin=True)

    membership = await ensure_active_membership(current_user.id, course.tenant_id, session)
    await ensure_current_learning_group_access(
        session=session,
        current_user=current_user,
        tenant=tenant,
        membership=membership,
    )
    return CourseDetailAccessContext(
        tenant=tenant,
        membership=membership,
        is_admin=await is_tenant_admin_member(course.tenant_id, current_user, session),
    )


async def _get_active_tenants(
    session: AsyncSession,
    tenant_ids: list[uuid.UUID],
) -> dict[uuid.UUID, Tenant]:
    active_tenants_res = await session.exec(
        select(Tenant).where(
            Tenant.id.in_(tenant_ids),
            Tenant.subscription_status == "active",
            Tenant.deleted_at == None,
            or_(Tenant.expires_at == None, Tenant.expires_at >= datetime.utcnow()),
        )
    )
    return {tenant.id: tenant for tenant in active_tenants_res.all()}
