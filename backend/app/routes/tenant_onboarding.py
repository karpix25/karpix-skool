import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel.ext.asyncio.session import AsyncSession

from ..db import get_session
from ..models import Tenant, User
from ..routes.auth import get_current_user
from ..schemas.onboarding import TenantOnboardingStatusRead
from ..services.super_activity import record_super_activity
from ..services.team_management import ensure_owner_or_super_admin_access
from ..services.tenant_access import ensure_tenant_access
from ..services.tenant_onboarding import (
    ONBOARDING_COMPLETED_EVENT,
    STUDENT_PREVIEW_EVENT,
    TenantOnboardingReadinessFacts,
    TenantOnboardingStatus,
    get_tenant_onboarding_status,
    get_tenant_onboarding_readiness_facts,
)


router = APIRouter(tags=["Tenant Onboarding"])


def _status_response(
    tenant: Tenant,
    status: TenantOnboardingStatus,
    readiness: TenantOnboardingReadinessFacts,
) -> TenantOnboardingStatusRead:
    return TenantOnboardingStatusRead(
        tenant_id=tenant.id,
        has_school_profile=readiness.has_school_profile,
        has_serving_subscription=readiness.has_serving_subscription,
        has_telegram_group=bool(tenant.telegram_group_id or tenant.telegram_group_id_vip),
        courses_count=status.courses_count,
        published_course_id=status.published_course_id,
        students_count=status.students_count,
        has_student_preview=status.has_student_preview,
        is_completed=status.is_completed,
    )


@router.get("/{tenant_id}/onboarding-status", response_model=TenantOnboardingStatusRead)
async def get_onboarding_status(
    tenant_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    tenant = await session.get(Tenant, tenant_id)
    if not tenant or tenant.deleted_at:
        raise HTTPException(status_code=404, detail="Tenant not found")
    await ensure_tenant_access(tenant.id, current_user, session, tenant=tenant)
    status = await get_tenant_onboarding_status(session, tenant.id)
    readiness = await get_tenant_onboarding_readiness_facts(session, tenant)
    return _status_response(tenant, status, readiness)


@router.post("/{tenant_id}/onboarding/student-preview", response_model=TenantOnboardingStatusRead)
async def confirm_student_preview(
    tenant_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    tenant = await ensure_owner_or_super_admin_access(tenant_id, current_user, session)
    status = await get_tenant_onboarding_status(session, tenant.id)
    if not status.published_course_id:
        raise HTTPException(status_code=409, detail="Publish a course and lesson before student preview")

    await record_super_activity(
        session,
        event_type=STUDENT_PREVIEW_EVENT,
        title="Student view checked",
        message="The school owner opened a published course in student view.",
        tone="success",
        actor_user_id=current_user.id,
        tenant_id=tenant.id,
        target_type="course",
        target_id=str(status.published_course_id),
        dedupe_key=f"{STUDENT_PREVIEW_EVENT}:{tenant.id}",
    )
    await session.commit()
    refreshed_status = await get_tenant_onboarding_status(session, tenant.id)
    readiness = await get_tenant_onboarding_readiness_facts(session, tenant)
    return _status_response(tenant, refreshed_status, readiness)


@router.post("/{tenant_id}/onboarding/complete", response_model=TenantOnboardingStatusRead)
async def complete_tenant_onboarding(
    tenant_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    tenant = await ensure_owner_or_super_admin_access(tenant_id, current_user, session)
    status = await get_tenant_onboarding_status(session, tenant.id)
    readiness = await get_tenant_onboarding_readiness_facts(session, tenant)
    is_ready = all((
        readiness.has_school_profile,
        readiness.has_serving_subscription,
        tenant.telegram_group_id or tenant.telegram_group_id_vip,
        status.published_course_id,
        status.has_student_preview,
        status.students_count > 0,
    ))
    if not is_ready:
        raise HTTPException(status_code=409, detail="Complete every required school launch step first")

    await record_super_activity(
        session,
        event_type=ONBOARDING_COMPLETED_EVENT,
        title="School onboarding completed",
        message="The owner completed every required school launch step.",
        tone="success",
        actor_user_id=current_user.id,
        tenant_id=tenant.id,
        target_type="tenant",
        target_id=str(tenant.id),
        dedupe_key=f"{ONBOARDING_COMPLETED_EVENT}:{tenant.id}",
    )
    await session.commit()
    refreshed_status = await get_tenant_onboarding_status(session, tenant.id)
    refreshed_readiness = await get_tenant_onboarding_readiness_facts(session, tenant)
    return _status_response(tenant, refreshed_status, refreshed_readiness)
