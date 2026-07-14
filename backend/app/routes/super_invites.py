import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.future import select
from sqlmodel.ext.asyncio.session import AsyncSession

from ..db import get_session
from ..models import Tenant, TenantSetupScope, User
from ..schemas.setup_tokens import OwnerInviteIssueRead, OwnerInviteStatusRead
from ..services.owner_invites import (
    OwnerInviteStatus,
    get_owner_invite_status,
    owner_invite_status_from_record,
)
from ..services.super_activity import record_super_activity
from ..services.tenant_setup_tokens import (
    issue_tenant_setup_token,
    revoke_active_setup_tokens,
    setup_command_for_token,
)
from .auth import get_super_user


router = APIRouter(tags=["Super Admin Owner Invites"])


def _status_response(status: OwnerInviteStatus) -> OwnerInviteStatusRead:
    return OwnerInviteStatusRead(
        tenant_id=status.tenant_id,
        status=status.status.value,
        expires_at=status.expires_at,
        created_at=status.created_at,
        revoked_at=status.revoked_at,
    )


async def _get_tenant(
    session: AsyncSession,
    tenant_id: uuid.UUID,
    *,
    lock_for_update: bool = False,
) -> Tenant:
    if lock_for_update:
        result = await session.execute(
            select(Tenant).where(Tenant.id == tenant_id).with_for_update()
        )
        tenant = result.scalars().first()
    else:
        tenant = await session.get(Tenant, tenant_id)
    if not tenant or tenant.deleted_at:
        raise HTTPException(status_code=404, detail="Tenant not found")
    return tenant


@router.get(
    "/tenants/{tenant_id}/owner-invite",
    response_model=OwnerInviteStatusRead,
)
async def get_owner_invite(
    tenant_id: uuid.UUID,
    _super_user: User = Depends(get_super_user),
    session: AsyncSession = Depends(get_session),
):
    tenant = await _get_tenant(session, tenant_id)
    return _status_response(await get_owner_invite_status(session, tenant))


@router.post(
    "/tenants/{tenant_id}/owner-invite/rotate",
    response_model=OwnerInviteIssueRead,
)
async def rotate_owner_invite(
    tenant_id: uuid.UUID,
    super_user: User = Depends(get_super_user),
    session: AsyncSession = Depends(get_session),
):
    tenant = await _get_tenant(session, tenant_id, lock_for_update=True)
    if tenant.owner_user_id is not None:
        raise HTTPException(status_code=409, detail="Tenant owner is already assigned")

    issue = await issue_tenant_setup_token(
        session,
        tenant_id=tenant.id,
        scope=TenantSetupScope.owner_invite,
        created_by_user_id=super_user.id,
    )
    await record_super_activity(
        session,
        event_type="school.owner_invite_rotated",
        title="Приглашение владельца обновлено",
        message=f"Для школы {tenant.name} выпущено новое приглашение владельца.",
        tone="info",
        actor_user_id=super_user.id,
        tenant_id=tenant.id,
        target_type="tenant",
        target_id=str(tenant.id),
    )
    await session.commit()
    await session.refresh(issue.record)
    status = owner_invite_status_from_record(tenant, issue.record)
    return OwnerInviteIssueRead(
        **_status_response(status).model_dump(),
        setup_command=setup_command_for_token(issue.token, issue.record.scope),
    )


@router.delete(
    "/tenants/{tenant_id}/owner-invite",
    response_model=OwnerInviteStatusRead,
)
async def revoke_owner_invite(
    tenant_id: uuid.UUID,
    super_user: User = Depends(get_super_user),
    session: AsyncSession = Depends(get_session),
):
    tenant = await _get_tenant(session, tenant_id, lock_for_update=True)
    revoked_count = await revoke_active_setup_tokens(
        session,
        tenant_id=tenant.id,
        scope=TenantSetupScope.owner_invite,
    )
    if revoked_count:
        await record_super_activity(
            session,
            event_type="school.owner_invite_revoked",
            title="Приглашение владельца отозвано",
            message=f"Приглашение владельца школы {tenant.name} отозвано.",
            tone="warning",
            actor_user_id=super_user.id,
            tenant_id=tenant.id,
            target_type="tenant",
            target_id=str(tenant.id),
        )
        await session.commit()
    return _status_response(await get_owner_invite_status(session, tenant))
