import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel.ext.asyncio.session import AsyncSession

from ..db import get_session
from ..models import Tenant, User
from ..routes.auth import get_current_user
from ..schemas.onboarding import TenantOnboardingStatusRead
from ..services.tenant_access import ensure_tenant_access
from ..services.tenant_onboarding import get_tenant_onboarding_status


router = APIRouter(tags=["Tenant Onboarding"])


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
    return TenantOnboardingStatusRead(
        tenant_id=tenant.id,
        has_telegram_group=bool(tenant.telegram_group_id or tenant.telegram_group_id_vip),
        courses_count=status.courses_count,
        published_course_id=status.published_course_id,
        students_count=status.students_count,
    )
