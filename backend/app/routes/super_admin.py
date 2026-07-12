from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import select
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
import uuid
from datetime import datetime
from pydantic import BaseModel

from ..db import get_session
from ..models import TenantSetupScope, User, Tenant, TenantMember
from ..schemas.super_admin import SuperActivityRead, SuperApplicationRead, UserSuperRead
from ..schemas.setup_tokens import SetupTokenIssueRequest, SetupTokenIssueResponse
from .auth import get_super_user
from ..services.super_activity import list_super_activity, record_super_activity
from ..services.super_applications import list_super_applications
from ..services.setup_codes import generate_setup_code
from ..services.telegram import send_telegram_notification
from ..services.tenant_setup_tokens import (
    issue_tenant_setup_token,
    mask_setup_secret,
    setup_command_for_token,
)
from ..services.tenant_stats import get_tenant_stat, get_tenant_stats

router = APIRouter(tags=["super_admin"])

# --- Schemas ---

class TenantSuperRead(BaseModel):
    id: uuid.UUID
    name: str
    owner_email: Optional[str]
    owner_username: Optional[str]
    owner_telegram_id: Optional[int]
    telegram_group_id: Optional[int]
    setup_code: Optional[str]
    setup_code_masked: bool = True
    subscription_status: str
    expires_at: Optional[datetime]
    member_count: int
    course_count: int

class TenantUpdate(BaseModel):
    subscription_status: Optional[str] = None
    owner_user_id: Optional[uuid.UUID] = None
    expires_at: Optional[datetime] = None

class TenantInviteRequest(BaseModel):
    name: str

class TenantInviteResponse(BaseModel):
    id: uuid.UUID
    name: str
    setup_code: Optional[str] = None
    setup_code_masked: bool = True
    setup_token: str
    setup_token_scope: TenantSetupScope
    setup_token_expires_at: datetime
    setup_command: str

class UserStatusUpdate(BaseModel):
    is_blocked: Optional[bool] = None
    admin_status: Optional[str] = None


@router.get("/activity", response_model=List[SuperActivityRead])
async def list_activity(
    limit: int = 30,
    tenant_id: Optional[uuid.UUID] = None,
    event_type: Optional[str] = None,
    super_user: User = Depends(get_super_user),
    session: AsyncSession = Depends(get_session),
):
    _ = super_user
    return await list_super_activity(
        session,
        limit=limit,
        tenant_id=tenant_id,
        event_type=event_type,
    )


@router.get("/applications", response_model=List[SuperApplicationRead])
async def list_applications(
    super_user: User = Depends(get_super_user),
    session: AsyncSession = Depends(get_session),
):
    _ = super_user
    return await list_super_applications(session)

@router.get("/tenants", response_model=List[TenantSuperRead])
async def list_all_tenants(
    super_user: User = Depends(get_super_user),
    session: AsyncSession = Depends(get_session)
):
    # Left join with User to get owner details (support schools with no owner)
    stmt = select(Tenant, User).outerjoin(User, Tenant.owner_user_id == User.id)
    result = await session.exec(stmt)
    items = result.all()
    stats_by_tenant = await get_tenant_stats(session, [tenant.id for tenant, _owner in items])

    output = []
    for tenant, owner in items:
        stats = stats_by_tenant[tenant.id]
        output.append({
            "id": tenant.id,
            "name": tenant.name,
            "owner_email": owner.email if owner else None,
            "owner_username": owner.username if owner else None,
            "owner_telegram_id": owner.telegram_id if owner else None,
            "telegram_group_id": tenant.telegram_group_id,
            "setup_code": mask_setup_secret(tenant.setup_code),
            "setup_code_masked": tenant.setup_code is not None,
            "subscription_status": tenant.subscription_status,
            "expires_at": tenant.expires_at,
            "member_count": stats.member_count,
            "course_count": stats.course_count
        })
    
    return output


@router.post("/tenants/{tenant_id}/setup-tokens", response_model=SetupTokenIssueResponse)
async def create_tenant_setup_token(
    tenant_id: uuid.UUID,
    request: SetupTokenIssueRequest,
    super_user: User = Depends(get_super_user),
    session: AsyncSession = Depends(get_session),
):
    tenant = await session.get(Tenant, tenant_id)
    if not tenant or tenant.deleted_at:
        raise HTTPException(status_code=404, detail="Tenant not found")

    issue = await issue_tenant_setup_token(
        session,
        tenant_id=tenant.id,
        scope=request.scope,
        created_by_user_id=super_user.id,
    )
    await record_super_activity(
        session,
        event_type="tenant.setup_token_created",
        title="Создан setup-токен",
        message=f"Для школы {tenant.name} создан токен подключения.",
        tone="info",
        actor_user_id=super_user.id,
        tenant_id=tenant.id,
        target_type="tenant",
        target_id=str(tenant.id),
        meta={"scope": request.scope.value},
    )
    await session.commit()
    await session.refresh(issue.record)
    return SetupTokenIssueResponse(
        token=issue.token,
        scope=issue.record.scope,
        expires_at=issue.record.expires_at,
        setup_command=setup_command_for_token(issue.token, issue.record.scope),
    )


@router.patch("/tenants/{tenant_id}")
async def update_tenant(
    tenant_id: uuid.UUID,
    updates: TenantUpdate,
    super_user: User = Depends(get_super_user),
    session: AsyncSession = Depends(get_session)
):
    tenant = await session.get(Tenant, tenant_id)
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    changes = {}
    # Apply updates
    if updates.subscription_status:
        changes["subscription_status"] = {
            "from": getattr(tenant.subscription_status, "value", tenant.subscription_status),
            "to": updates.subscription_status,
        }
        tenant.subscription_status = updates.subscription_status
    if updates.owner_user_id:
        changes["owner_user_id"] = {
            "from": str(tenant.owner_user_id) if tenant.owner_user_id else None,
            "to": str(updates.owner_user_id),
        }
        tenant.owner_user_id = updates.owner_user_id
    if updates.expires_at:
        changes["expires_at"] = {
            "from": tenant.expires_at.isoformat() if tenant.expires_at else None,
            "to": updates.expires_at.isoformat(),
        }
        tenant.expires_at = updates.expires_at

    if changes:
        tenant.updated_at = datetime.utcnow()
        await record_super_activity(
            session,
            event_type="tenant.updated",
            title="Школа обновлена",
            message=f"Параметры школы {tenant.name} изменены.",
            tone="warning" if updates.subscription_status == "past_due" else "info",
            actor_user_id=super_user.id,
            tenant_id=tenant.id,
            target_type="tenant",
            target_id=str(tenant.id),
            meta={"changes": changes},
        )

    session.add(tenant)
    await session.commit()
    await session.refresh(tenant)
    
    # Get owner info for response
    owner = await session.get(User, tenant.owner_user_id)
    
    stats = await get_tenant_stat(session, tenant.id)

    return {
        "id": tenant.id,
        "name": tenant.name,
        "owner_email": owner.email if owner else None,
        "owner_username": owner.username if owner else None,
        "subscription_status": tenant.subscription_status,
        "expires_at": tenant.expires_at,
        "member_count": stats.member_count,
        "course_count": stats.course_count
    }

@router.get("/users", response_model=List[UserSuperRead])
async def list_users(
    super_user: User = Depends(get_super_user),
    session: AsyncSession = Depends(get_session)
):
    from sqlalchemy.orm import selectinload
    stmt = select(User).options(
        selectinload(User.memberships).selectinload(TenantMember.tenant)
    )
    result = await session.exec(stmt)
    users = result.all()
    
    output = []
    for u in users:
        memberships = []
        for m in u.memberships:
            if m.tenant:
                memberships.append({
                    "tenant_id": m.tenant_id,
                    "tenant_name": m.tenant.name,
                    "role": m.role
                })
        
        output.append({
            "id": u.id,
            "telegram_id": u.telegram_id,
            "username": u.username,
            "is_super_admin": u.is_super_admin,
            "admin_status": u.admin_status,
            "is_blocked": u.is_blocked,
            "admin_request_details": u.admin_request_details if isinstance(u.admin_request_details, dict) else None,
            "memberships": memberships
        })
    
    return output

@router.patch("/users/{user_id}")
async def update_user_status(
    user_id: uuid.UUID,
    updates: UserStatusUpdate,
    super_user: User = Depends(get_super_user),
    session: AsyncSession = Depends(get_session)
):
    user = await session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    status_changed = False
    block_changed = False
    old_status_value = getattr(user.admin_status, "value", user.admin_status)
    old_blocked = user.is_blocked
    if updates.is_blocked is not None:
        user.is_blocked = updates.is_blocked
        block_changed = old_blocked != updates.is_blocked
    if updates.admin_status is not None:
        user.admin_status = updates.admin_status
        status_changed = old_status_value != updates.admin_status
        
        # Notify if approved
        if updates.admin_status == "approved" and old_status_value != "approved" and user.telegram_id:
            await send_telegram_notification(
                user.telegram_id, 
                "🎉 **Ваша заявка одобрена!**\n\nТеперь вы можете создать свою школу в приложении. 🚀"
            )

    if status_changed or block_changed:
        user.updated_at = datetime.utcnow()
    if status_changed:
        await record_super_activity(
            session,
            event_type="author.status_changed",
            title="Статус автора обновлен",
            message=f"Заявка {user.username or user.telegram_id or user.id} переведена в статус {updates.admin_status}.",
            tone="success" if updates.admin_status == "approved" else "danger" if updates.admin_status == "rejected" else "info",
            actor_user_id=super_user.id,
            target_type="user",
            target_id=str(user.id),
            meta={"from": old_status_value, "to": updates.admin_status},
        )
    if block_changed:
        await record_super_activity(
            session,
            event_type="user.blocked" if user.is_blocked else "user.unblocked",
            title="Доступ пользователя обновлен",
            message=f"Пользователь {user.username or user.telegram_id or user.id} {'заблокирован' if user.is_blocked else 'разблокирован'}.",
            tone="danger" if user.is_blocked else "success",
            actor_user_id=super_user.id,
            target_type="user",
            target_id=str(user.id),
        )

    session.add(user)
    await session.commit()
    await session.refresh(user)
    return user

@router.delete("/users/{user_id}/request")
async def reset_user_admin_request(
    user_id: uuid.UUID,
    super_user: User = Depends(get_super_user),
    session: AsyncSession = Depends(get_session)
):
    """
    Reset a user's admin application status and details.
    Allows re-testing the onboarding flow.
    """
    user = await session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user.admin_status = "none"
    user.admin_request_details = None
    user.updated_at = datetime.utcnow()

    await record_super_activity(
        session,
        event_type="author.request_reset",
        title="Заявка автора сброшена",
        message=f"Заявка {user.username or user.telegram_id or user.id} сброшена для повторной проверки.",
        tone="info",
        actor_user_id=super_user.id,
        target_type="user",
        target_id=str(user.id),
    )
    
    session.add(user)
    await session.commit()
    
    return {"message": f"Admin request for user {user.username or user_id} has been reset."}

@router.post("/tenants/invite", response_model=TenantInviteResponse)
async def invite_tenant_admin(
    invite_data: TenantInviteRequest,
    super_user: User = Depends(get_super_user),
    session: AsyncSession = Depends(get_session)
):
    # Create Tenant with no owner
    new_tenant = Tenant(
        name=invite_data.name,
        owner_user_id=None, # No owner yet!
        setup_code=generate_setup_code()
    )
    
    session.add(new_tenant)
    issue = await issue_tenant_setup_token(
        session,
        tenant_id=new_tenant.id,
        scope=TenantSetupScope.owner_invite,
        created_by_user_id=super_user.id,
    )
    await record_super_activity(
        session,
        event_type="school.invited",
        title="Создано приглашение школы",
        message=f"Суперадмин создал приглашение для школы {new_tenant.name}.",
        tone="success",
        actor_user_id=super_user.id,
        tenant_id=new_tenant.id,
        target_type="tenant",
        target_id=str(new_tenant.id),
    )
    await session.commit()
    await session.refresh(new_tenant)
    await session.refresh(issue.record)
    
    return TenantInviteResponse(
        id=new_tenant.id,
        name=new_tenant.name,
        setup_code=mask_setup_secret(new_tenant.setup_code),
        setup_code_masked=new_tenant.setup_code is not None,
        setup_token=issue.token,
        setup_token_scope=issue.record.scope,
        setup_token_expires_at=issue.record.expires_at,
        setup_command=setup_command_for_token(issue.token, issue.record.scope),
    )

@router.delete("/tenants/{tenant_id}")
async def delete_tenant(
    tenant_id: uuid.UUID,
    super_user: User = Depends(get_super_user),
    session: AsyncSession = Depends(get_session)
):
    """
    Delete a tenant and all associated data (cascade).
    Requires super admin privileges.
    """
    # Get tenant
    tenant = await session.get(Tenant, tenant_id)
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    await record_super_activity(
        session,
        event_type="school.deleted",
        title="Школа удалена",
        message=f"Школа {tenant.name} удалена из платформы.",
        tone="danger",
        actor_user_id=super_user.id,
        target_type="tenant",
        target_id=str(tenant.id),
        meta={"tenant_name": tenant.name},
    )

    # Delete tenant (cascade will handle related records due to model relationships)
    await session.delete(tenant)
    await session.commit()
    
    return {"message": f"Tenant '{tenant.name}' deleted successfully"}
@router.delete("/users/{user_id}")
async def delete_user(
    user_id: uuid.UUID,
    super_user: User = Depends(get_super_user),
    session: AsyncSession = Depends(get_session)
):
    """
    Delete a user and all their associated data (cascade).
    Requires super admin privileges.
    """
    user = await session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user.is_super_admin:
        raise HTTPException(status_code=403, detail="Cannot delete a Super Admin")
        
    await session.delete(user)
    await session.commit()
    
    return {"message": f"User '{user.username or user_id}' deleted successfully"}
