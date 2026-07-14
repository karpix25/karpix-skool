from datetime import datetime
import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from ..db import get_session
from ..models import SubscriptionStatus, Tenant, User
from ..models_subscription import (
    SubscriptionLifecycleStatus,
    TenantPlan,
    TenantSubscriptionEvent,
)
from ..schemas.subscriptions import PlanRead, SubscriptionRead, SubscriptionUpdate
from ..services.subscriptions import (
    build_entitlement,
    get_tenant_subscription,
    normalize_utc_naive,
)
from .auth import get_super_user


router = APIRouter(tags=["Super Admin Subscriptions"])


def _subscription_response(subscription, plan) -> SubscriptionRead:
    entitlement = build_entitlement(subscription, plan)
    return SubscriptionRead(
        tenant_id=subscription.tenant_id,
        status=subscription.status,
        plan=PlanRead.model_validate(plan, from_attributes=True),
        current_period_start=subscription.current_period_start,
        current_period_end=subscription.current_period_end,
        trial_ends_at=subscription.trial_ends_at,
        is_write_allowed=entitlement.is_write_allowed,
        is_ai_allowed=entitlement.is_ai_allowed,
        blocking_reason=entitlement.blocking_reason,
    )


@router.get("/plans", response_model=list[PlanRead])
async def list_plans(
    _super_user: User = Depends(get_super_user),
    session: AsyncSession = Depends(get_session),
):
    result = await session.exec(
        select(TenantPlan).where(TenantPlan.is_active == True).order_by(TenantPlan.created_at)
    )
    return [PlanRead.model_validate(plan, from_attributes=True) for plan in result.all()]


@router.get("/tenants/{tenant_id}/subscription", response_model=SubscriptionRead)
async def get_subscription(
    tenant_id: uuid.UUID,
    _super_user: User = Depends(get_super_user),
    session: AsyncSession = Depends(get_session),
):
    subscription, plan = await get_tenant_subscription(session, tenant_id)
    if not subscription or not plan:
        raise HTTPException(status_code=404, detail="Tenant subscription not found")
    return _subscription_response(subscription, plan)


@router.patch("/tenants/{tenant_id}/subscription", response_model=SubscriptionRead)
async def update_subscription(
    tenant_id: uuid.UUID,
    updates: SubscriptionUpdate,
    super_user: User = Depends(get_super_user),
    session: AsyncSession = Depends(get_session),
):
    tenant = await session.get(Tenant, tenant_id)
    if not tenant or tenant.deleted_at:
        raise HTTPException(status_code=404, detail="Tenant not found")

    subscription, plan = await get_tenant_subscription(session, tenant_id)
    if not subscription or not plan:
        raise HTTPException(status_code=404, detail="Tenant subscription not found")

    if updates.plan_code:
        plan_result = await session.exec(
            select(TenantPlan).where(
                TenantPlan.code == updates.plan_code,
                TenantPlan.is_active == True,
            )
        )
        selected_plan = plan_result.first()
        if not selected_plan:
            raise HTTPException(status_code=422, detail="Unknown or inactive plan")
        plan = selected_plan
        subscription.plan_id = plan.id

    previous_status = subscription.status
    if updates.status is not None:
        subscription.status = updates.status
    if updates.current_period_end is not None:
        subscription.current_period_end = normalize_utc_naive(updates.current_period_end)
        if subscription.status == SubscriptionLifecycleStatus.trialing:
            subscription.trial_ends_at = subscription.current_period_end
    subscription.activated_by_user_id = super_user.id
    subscription.updated_at = datetime.utcnow()

    tenant.subscription_status = (
        SubscriptionStatus.active
        if subscription.status in {
            SubscriptionLifecycleStatus.active,
            SubscriptionLifecycleStatus.trialing,
        }
        else SubscriptionStatus.past_due
    )
    tenant.expires_at = subscription.current_period_end
    tenant.updated_at = datetime.utcnow()
    session.add(subscription)
    session.add(tenant)
    session.add(
        TenantSubscriptionEvent(
            tenant_id=tenant.id,
            subscription_id=subscription.id,
            event_type="subscription.manually_updated",
            from_status=previous_status.value,
            to_status=subscription.status.value,
            actor_user_id=super_user.id,
            reason=updates.reason,
            event_meta={"plan_code": plan.code},
        )
    )
    await session.commit()
    await session.refresh(subscription)
    return _subscription_response(subscription, plan)
