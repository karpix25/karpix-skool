from datetime import datetime

from sqlalchemy import func
from sqlalchemy.future import select

from ..models import MemberRole, MemberStatus, Tenant, TenantMember
from ..models_subscription import TenantPlan, TenantSubscription
from .subscriptions import build_entitlement, build_legacy_entitlement


async def can_activate_student(
    db,
    tenant: Tenant,
    *,
    role: MemberRole = MemberRole.student,
) -> bool:
    subscription_result = await db.execute(
        select(TenantSubscription, TenantPlan)
        .join(TenantPlan, TenantPlan.id == TenantSubscription.plan_id)
        .where(TenantSubscription.tenant_id == tenant.id)
    )
    row = subscription_result.first()
    if row:
        subscription, plan = row
        entitlement = build_entitlement(subscription, plan, now=datetime.utcnow())
    else:
        plan = None
        entitlement = build_legacy_entitlement(tenant, now=datetime.utcnow())

    if not entitlement.is_write_allowed:
        return False
    if not plan or role != MemberRole.student:
        return True

    count_result = await db.execute(
        select(func.count(TenantMember.id)).where(
            TenantMember.tenant_id == tenant.id,
            TenantMember.role == MemberRole.student,
            TenantMember.status == MemberStatus.active,
            TenantMember.deleted_at == None,
        )
    )
    return count_result.scalar_one() < plan.max_students
