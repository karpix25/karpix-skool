from fastapi import APIRouter, Depends, Body, BackgroundTasks, HTTPException, Response
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlmodel import select
from typing import Dict, Any, Optional
from datetime import datetime, timedelta
import uuid

from ..db import get_session
from ..models import User, MemberRole, MemberStatus, Tenant, TenantMember
from ..config import settings
from .auth import get_current_user, get_super_user
from ..auth import create_access_token
from ..auth_cookies import set_access_token_cookie
from ..utils.logging_config import logger
from ..services.user import sync_user_avatar
from ..services.tenant_links import safe_free_group_link_for_response, safe_vip_group_link_for_response
from ..services.tenant_welcome_video import tenant_welcome_video_fields
from ..services.webapp.group_membership import sync_membership_from_telegram_groups
from ..services.webapp.leaderboard import build_leaderboard_response
from ..services.webapp.leaderboard_summary import build_leaderboard_summary_response
from ..services.webapp.profile_access import filter_verified_memberships, profile_access_status
from ..services.webapp.telegram_init_data import (
    parse_webapp_user_data,
    require_valid_init_data,
    validate_telegram_data,
)
from ..schemas.webapp_leaderboard import WebAppLeaderboardSummaryResponse
from aiogram import Bot

router = APIRouter()


def build_webapp_tenant_payload(tenant: Tenant) -> dict[str, Any]:
    return {
        "id": str(tenant.id),
        "name": tenant.name,
        "description": tenant.description,
        "logo_url": tenant.logo_url,
        "accent_color": tenant.accent_color,
        "support_url": tenant.support_url,
        "free_group_link": safe_free_group_link_for_response(tenant.free_group_link),
        "vip_group_link": safe_vip_group_link_for_response(tenant.vip_group_link),
        "level_names": tenant.level_names,
        **tenant_welcome_video_fields(tenant),
    }


def build_webapp_requested_tenant_payload(tenant: Tenant) -> dict[str, Any]:
    return {
        **build_webapp_tenant_payload(tenant),
        "telegram_group_id": tenant.telegram_group_id,
        "telegram_group_id_vip": tenant.telegram_group_id_vip,
    }

@router.post("/login")
async def webapp_login(
    response: Response,
    init_data: str = Body(..., embed=True),
    session: AsyncSession = Depends(get_session)
):
    require_valid_init_data(init_data, settings.BOT_TOKEN)
    webapp_user = parse_webapp_user_data(init_data)
    telegram_id = webapp_user.telegram_id
    username = webapp_user.username
    photo_url = webapp_user.photo_url
    start_param = webapp_user.start_param

    # 3. Find or Create User
    is_sa_match = False
    try:
        if settings.SUPER_ADMIN_ID is not None and telegram_id is not None:
            is_sa_match = int(str(telegram_id).strip()) == int(str(settings.SUPER_ADMIN_ID).strip())
    except Exception as e:
        logger.error(f"DEBUG LOGIN ERROR: {e}")

    stmt = select(User).where(User.telegram_id == telegram_id)
    result = await session.exec(stmt)
    user = result.first()

    changed = False
    if not user:
        user = User(
            telegram_id=telegram_id,
            username=username,
            avatar_url=photo_url,
            is_super_admin=is_sa_match
        )
        session.add(user)
        await session.flush()
    else:
        # Update existing user data if changed
        if user.username != username:
            user.username = username
            changed = True
        
        if is_sa_match and not user.is_super_admin:
            user.is_super_admin = True
            changed = True

    # Avatar Persistence Logic
    if photo_url or not user.avatar_url:
        bot = Bot(token=settings.BOT_TOKEN)
        try:
            if await sync_user_avatar(user, bot, photo_url):
                changed = True
        except Exception as e:
            logger.error(f"AVATAR SYNC ERROR IN LOGIN: {e}")
        finally:
            await bot.session.close()

    if changed:
        session.add(user)

    # 3.5 Find the correct Tenant
    tenant = None
    tenant_requested_from_start_param = False
    if start_param:
        try:
            import uuid
            tenant_uuid = uuid.UUID(start_param)
            tenant = await session.get(Tenant, tenant_uuid)
            tenant_requested_from_start_param = tenant is not None
        except (ValueError, ImportError):
            pass
    
    # Smart Fallback: 
    # If no specific tenant found via start_param, try to get user's existing membership
    if not tenant:
        stmt_my_m = select(Tenant).join(TenantMember).where(
            TenantMember.user_id == user.id,
            TenantMember.status == MemberStatus.active,
            TenantMember.deleted_at == None,
            Tenant.deleted_at == None,
        )
        res_my_m = await session.exec(stmt_my_m.limit(2))
        membership_tenants = list(res_my_m.all())
        if len(membership_tenants) == 1:
            tenant = membership_tenants[0]
    
    membership = None
    if tenant:
        stmt_m = select(TenantMember).where(
            TenantMember.user_id == user.id,
            TenantMember.tenant_id == tenant.id,
            TenantMember.deleted_at == None,
        )
        if not tenant_requested_from_start_param:
            stmt_m = stmt_m.where(TenantMember.status == MemberStatus.active)
        res_m = await session.exec(stmt_m)
        membership = res_m.first()

        if tenant_requested_from_start_param:
            membership = await sync_membership_from_telegram_groups(
                session=session,
                current_user=user,
                tenant=tenant,
                membership=membership,
            )
        if membership and membership.status != MemberStatus.active:
            membership = None
        
        # NOTE: Individual membership sync on login removed to optimize performance.
        # Bulk group-wide sync is now triggered by the School Owner in get_my_profile.

    await session.commit()
    await session.refresh(user)
    if membership:
        await session.refresh(membership)
    
    # 4. Create Token
    # Determine role for token (optional metadata)
    role = "student"
    if user.is_super_admin or (membership and (membership.role == "admin" or membership.role == "owner")):
        role = "admin"

    token = create_access_token(subject=str(user.id), extra_data={"role": role})
    set_access_token_cookie(response, token)
    
    return {
        "access_token": token, 
        "token_type": "bearer", 
        "user": {
            "id": str(user.id),
            "username": user.username,
            "telegram_id": user.telegram_id,
            "is_super_admin": user.is_super_admin,
            "admin_status": user.admin_status
        }
    }

from ..utils.cache import clear_cache

@router.post("/debug/clear-cache")
async def force_clear_cache(
    current_user: User = Depends(get_super_user),
):
    await clear_cache("cache:*")
    return {"message": "All cache cleared"}

async def sync_group_admins_background(chat_id: int, tenant_id: uuid.UUID):
    """
    Background task wrapper that creates its own session.
    Prevents 'closed session' errors when using the request session in background.
    """
    from ..db import async_session_maker
    from ..services.telegram import sync_group_admins
    from ..models import Tenant
    
    async with async_session_maker() as session:
        # Fetch fresh tenant object with this session
        tenant = await session.get(Tenant, tenant_id)
        if tenant:
            await sync_group_admins(chat_id, tenant, session)
            logger.info(f"SYNC: Background sync completed for tenant {tenant_id}")

@router.get("/me")
async def get_my_profile(
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
    tenant_id: Optional[uuid.UUID] = None,
    setup_code: Optional[str] = None
):
    logger.debug(f"DEBUG_ME: Entering get_my_profile for user={current_user.id}")
    # Promotion check
    is_sa_match = False
    try:
        if settings.SUPER_ADMIN_ID is not None and current_user.telegram_id is not None:
            is_sa_match = int(str(current_user.telegram_id).strip()) == int(str(settings.SUPER_ADMIN_ID).strip())
    except Exception as e:
        logger.error(f"DEBUG ME ERROR: {e}")
    
    if is_sa_match and not current_user.is_super_admin:
        current_user.is_super_admin = True
        session.add(current_user)
        await session.commit()
        await session.refresh(current_user)

    if setup_code:
        raise HTTPException(status_code=422, detail="Legacy setup codes are no longer supported.")

    requested_tenant_explicitly = bool(tenant_id)
    explicit_tenant = None
    if tenant_id:
        explicit_tenant = await session.get(Tenant, tenant_id)

    if explicit_tenant:
        existing_stmt = select(TenantMember).where(
            TenantMember.user_id == current_user.id,
            TenantMember.tenant_id == explicit_tenant.id,
            TenantMember.deleted_at == None,
        )
        existing_res = await session.exec(existing_stmt)
        await sync_membership_from_telegram_groups(
            session=session,
            current_user=current_user,
            tenant=explicit_tenant,
            membership=existing_res.first(),
        )

    # Find relevant membership with Tenant loaded
    from sqlalchemy.orm import selectinload
    stmt = (
        select(TenantMember)
        .join(Tenant)
        .where(
            TenantMember.user_id == current_user.id,
            TenantMember.status == MemberStatus.active,
            TenantMember.deleted_at == None,
            Tenant.deleted_at == None,
        )
        .options(selectinload(TenantMember.tenant))
    )
    
    if tenant_id:
        stmt = stmt.where(TenantMember.tenant_id == tenant_id)

    res = await session.exec(stmt)
    active_membership = res.first()
    
    # Get ALL memberships for the school switcher
    all_stmt = (
        select(TenantMember)
        .join(Tenant)
        .where(
            TenantMember.user_id == current_user.id,
            TenantMember.status == MemberStatus.active,
            TenantMember.deleted_at == None,
            Tenant.deleted_at == None,
        )
        .options(selectinload(TenantMember.tenant))
    )
    all_res = await session.exec(all_stmt)
    all_memberships = all_res.all()
    all_memberships = await filter_verified_memberships(
        session=session,
        current_user=current_user,
        memberships=all_memberships,
    )

    if active_membership and not any(m.id == active_membership.id for m in all_memberships):
        active_membership = None
    
    if not requested_tenant_explicitly:
        if len(all_memberships) > 1:
            raise HTTPException(
                status_code=409,
                detail="Tenant context is required when multiple schools are available.",
            )
        active_membership = all_memberships[0] if all_memberships else None

    access_status = profile_access_status(
        requested_tenant_explicitly=requested_tenant_explicitly,
        explicit_tenant=explicit_tenant,
        active_membership=active_membership,
    )

    # If user is owner of a tenant, trigger background sync (bulk)
    # This avoids checking every single student on login.
    if active_membership and active_membership.role == MemberRole.owner and active_membership.tenant:
        # Check debounce: only sync if it hasn't been done in 1 hour
        should_sync = not active_membership.tenant.last_sync_at or (active_membership.tenant.last_sync_at < datetime.utcnow() - timedelta(hours=1))
        
        if should_sync:
            background_tasks.add_task(
                sync_group_admins_background, 
                active_membership.tenant.telegram_group_id, 
                active_membership.tenant.id
            )
            logger.info(f"SYNC: Triggered safe background admin sync for tenant {active_membership.tenant.id} by owner {current_user.username}")

    can_view_requested_tenant = bool(
        explicit_tenant
        and (
            current_user.is_super_admin
            or (
                active_membership
                and active_membership.tenant_id == explicit_tenant.id
            )
        )
    )

    return {
        "user": {
            "id": str(current_user.id),
            "username": current_user.username,
            "telegram_id": current_user.telegram_id,
            "is_super_admin": current_user.is_super_admin,
            "admin_status": current_user.admin_status,
            "avatar_url": current_user.avatar_url,
            "is_onboarded": current_user.is_onboarded
        },
        "membership": {
            "id": str(active_membership.id),
            "role": active_membership.role,
            "status": active_membership.status,
            "tenant_id": str(active_membership.tenant_id),
            "level": active_membership.level,
            "xp": active_membership.xp,
            "is_onboarded": active_membership.is_onboarded
        } if active_membership else None,
        "tenant": (
            build_webapp_tenant_payload(active_membership.tenant)
            if active_membership and active_membership.tenant
            else None
        ),
        "requested_tenant": (
            build_webapp_requested_tenant_payload(explicit_tenant)
            if requested_tenant_explicitly and can_view_requested_tenant
            else None
        ),
        "tenant_id": (
            str(active_membership.tenant_id if active_membership else explicit_tenant.id)
            if (active_membership or can_view_requested_tenant)
            else None
        ),
        "access_status": access_status,
        "memberships": [
            {
                "tenant_id": str(m.tenant_id),
                "tenant_name": m.tenant.name,
                "role": m.role,
                "status": m.status,
                "level": m.level,
                "xp": m.xp
            } for m in all_memberships
        ]
    }


@router.get("/leaderboard/summary", response_model=WebAppLeaderboardSummaryResponse)
async def get_leaderboard_summary(
    tenant_id: Optional[uuid.UUID] = None,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """
    Returns the production leaderboard summary for the new webapp UI.
    """
    return await build_leaderboard_summary_response(session, current_user, tenant_id)


@router.get("/leaderboard")
async def get_leaderboard(
    period: str = "all", # all, month, week
    tenant_id: Optional[uuid.UUID] = None,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """
    Returns ranked members for the tenants the user belongs to.
    """
    return await build_leaderboard_response(session, current_user, period, tenant_id)

@router.patch("/profile")
async def update_profile(
    data: Dict[str, Any] = Body(...),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    if "username" in data:
        current_user.username = data["username"]
    
    session.add(current_user)
    await session.commit()
    await session.refresh(current_user)
    return {"status": "success", "username": current_user.username}

@router.post("/onboarding/complete")
async def complete_onboarding(
    tenant_id: Optional[uuid.UUID] = None,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    # If admin (owner/admin of a tenant), mark User as onboarded
    # If student, mark Membership as onboarded for this tenant
    
    # 1. Check if user is an admin for ANY tenant or global admin
    is_platform_admin = current_user.is_super_admin or current_user.admin_status == "approved"
    if is_platform_admin:
        current_user.is_onboarded = True
        session.add(current_user)

    if tenant_id is None:
        if not is_platform_admin:
            raise HTTPException(status_code=400, detail="tenant_id is required")
        await session.commit()
        return {"status": "success"}

    # 2. Mark only the requested tenant membership as onboarded.
    stmt = select(TenantMember).where(
        TenantMember.user_id == current_user.id,
        TenantMember.tenant_id == tenant_id,
    )
    
    res = await session.exec(stmt)
    memberships = res.all()
    for m in memberships:
        m.is_onboarded = True
        session.add(m)
        
    await session.commit()
    return {"status": "success"}
