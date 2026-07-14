import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from ..db import get_session
from ..models import Tenant, User
from ..models_subscription import (
    TenantPlan,
)
from ..schemas.subscriptions import (
    PlanRead,
    SubscriptionUpdate,
    SubscriptionUsageRead,
    SuperSubscriptionRead,
)
from ..services.subscription_lifecycle import (
    InvalidSubscriptionTransition,
    apply_manual_subscription_update,
)
from ..services.subscription_usage import get_subscription_usage
from ..services.subscriptions import (
    build_entitlement,
    get_tenant_subscription,
)
from .auth import get_super_user


router = APIRouter(tags=["Super Admin Subscriptions"])


async def _subscription_response(session, subscription, plan) -> SuperSubscriptionRead:
    entitlement = build_entitlement(subscription, plan)
    usage = await get_subscription_usage(session, subscription.tenant_id)
    return SuperSubscriptionRead(
        tenant_id=subscription.tenant_id,
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


@router.get("/plans", response_model=list[PlanRead])
async def list_plans(
    _super_user: User = Depends(get_super_user),
    session: AsyncSession = Depends(get_session),
):
    result = await session.exec(
        select(TenantPlan).where(TenantPlan.is_active == True).order_by(TenantPlan.created_at)
    )
    return [PlanRead.model_validate(plan, from_attributes=True) for plan in result.all()]


@router.get("/tenants/{tenant_id}/subscription", response_model=SuperSubscriptionRead)
async def get_subscription(
    tenant_id: uuid.UUID,
    _super_user: User = Depends(get_super_user),
    session: AsyncSession = Depends(get_session),
):
    subscription, plan = await get_tenant_subscription(session, tenant_id)
    if not subscription or not plan:
        raise HTTPException(status_code=404, detail="Tenant subscription not found")
    return await _subscription_response(session, subscription, plan)


@router.patch("/tenants/{tenant_id}/subscription", response_model=SuperSubscriptionRead)
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

    target_plan = plan
    if updates.plan_code and updates.plan_code != plan.code:
        plan_result = await session.exec(
            select(TenantPlan).where(
                TenantPlan.code == updates.plan_code,
                TenantPlan.is_active == True,
            )
        )
        selected_plan = plan_result.first()
        if not selected_plan:
            raise HTTPException(status_code=422, detail="Unknown or inactive plan")
        target_plan = selected_plan

    try:
        event = apply_manual_subscription_update(
            tenant=tenant,
            subscription=subscription,
            current_plan=plan,
            target_plan=target_plan,
            requested_status=updates.status,
            requested_period_end=updates.current_period_end,
            actor_user_id=super_user.id,
            reason=updates.reason,
        )
    except InvalidSubscriptionTransition as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc

    if event is None:
        return await _subscription_response(session, subscription, plan)

    session.add(subscription)
    session.add(tenant)
    session.add(event)
    await session.commit()
    await session.refresh(subscription)
    return await _subscription_response(session, subscription, target_plan)
