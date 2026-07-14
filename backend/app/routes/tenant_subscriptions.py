import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel.ext.asyncio.session import AsyncSession

from ..db import get_session
from ..models import Tenant, User
from ..schemas.subscriptions import PlanRead, SubscriptionUsageRead, SuperSubscriptionRead
from ..services.subscription_usage import get_subscription_usage
from ..services.subscriptions import build_entitlement, get_tenant_subscription
from ..services.tenant_access import ensure_tenant_access
from .auth import get_current_user


router = APIRouter(tags=["Tenant Subscriptions"])


@router.get("/{tenant_id}/subscription", response_model=SuperSubscriptionRead)
async def get_owner_subscription(
    tenant_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    tenant = await session.get(Tenant, tenant_id)
    if not tenant or tenant.deleted_at:
        raise HTTPException(status_code=404, detail="Tenant not found")
    await ensure_tenant_access(tenant.id, current_user, session, tenant=tenant)

    subscription, plan = await get_tenant_subscription(session, tenant.id)
    if not subscription or not plan:
        raise HTTPException(status_code=404, detail="Tenant subscription not found")
    entitlement = build_entitlement(subscription, plan)
    usage = await get_subscription_usage(session, tenant.id)
    return SuperSubscriptionRead(
        tenant_id=tenant.id,
        status=subscription.status,
        plan=PlanRead.model_validate(plan, from_attributes=True),
        current_period_start=subscription.current_period_start,
        current_period_end=subscription.current_period_end,
        trial_ends_at=subscription.trial_ends_at,
        is_write_allowed=entitlement.is_write_allowed,
        is_ai_allowed=entitlement.is_ai_allowed,
        blocking_reason=entitlement.blocking_reason,
        usage=SubscriptionUsageRead(
            courses_used=usage.courses_used,
            students_used=usage.students_used,
            ai_jobs_used=usage.ai_jobs_used,
            storage_bytes_used=usage.storage_bytes_used,
        ),
    )
