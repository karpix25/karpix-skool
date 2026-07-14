from datetime import datetime
from typing import Optional

from fastapi import HTTPException
from sqlmodel.ext.asyncio.session import AsyncSession

from ...models import MemberRole, MemberRoleSource, MemberStatus, Tenant, TenantMember, User
from ...services.subscriptions import ensure_student_capacity, ensure_tenant_write_entitlement
from ...services.telegram import TelegramMembershipState, check_user_membership_state
from ...utils.logging_config import logger


TENANT_MANAGER_ROLES = {MemberRole.owner, MemberRole.admin}
GROUP_ACCESS_DENIED = (
    "Доступ к школе открыт только участникам привязанной Telegram-группы. "
    "Вступите в группу или обратитесь к администратору."
)


def tenant_has_learning_group(tenant: Tenant) -> bool:
    return bool(tenant.telegram_group_id or tenant.telegram_group_id_vip)


def is_membership_exempt_from_group_check(user: User, membership: TenantMember) -> bool:
    return bool(getattr(user, "is_super_admin", False) or membership.role in TENANT_MANAGER_ROLES)


async def ensure_current_learning_group_access(
    *,
    session: AsyncSession,
    current_user: User,
    tenant: Tenant,
    membership: TenantMember,
) -> None:
    if await has_current_learning_group_access(
        session=session,
        current_user=current_user,
        tenant=tenant,
        membership=membership,
    ):
        return

    raise HTTPException(status_code=403, detail=GROUP_ACCESS_DENIED)


async def has_current_learning_group_access(
    *,
    session: AsyncSession,
    current_user: User,
    tenant: Tenant,
    membership: TenantMember,
) -> bool:
    if is_membership_exempt_from_group_check(current_user, membership):
        return True

    if not tenant_has_learning_group(tenant):
        return True

    if current_user.telegram_id is None:
        await pause_stale_membership(session, membership)
        return False

    check = await check_user_membership_state(current_user.telegram_id, tenant)
    if check.state == TelegramMembershipState.verified:
        return True

    if check.state == TelegramMembershipState.denied:
        await pause_stale_membership(session, membership)
        logger.warning(
            "SECURITY_DENIED: user=%s tenant=%s has DB membership but is not in linked Telegram group",
            current_user.id,
            tenant.id,
        )
    else:
        logger.warning(
            "SECURITY_UNCERTAIN: user=%s tenant=%s Telegram group membership could not be verified",
            current_user.id,
            tenant.id,
        )
        return True
    return False


async def pause_stale_membership(session: AsyncSession, membership: TenantMember) -> None:
    if membership.status == MemberStatus.paused:
        return

    membership.status = MemberStatus.paused
    membership.paused_at = datetime.utcnow()
    session.add(membership)
    await session.commit()


async def sync_membership_from_telegram_groups(
    *,
    session: AsyncSession,
    current_user: User,
    tenant: Tenant,
    membership: Optional[TenantMember],
) -> Optional[TenantMember]:
    if not tenant_has_learning_group(tenant) or current_user.telegram_id is None:
        return membership

    check = await check_user_membership_state(current_user.telegram_id, tenant)
    if check.state == TelegramMembershipState.denied:
        if membership and not is_membership_exempt_from_group_check(current_user, membership):
            await pause_stale_membership(session, membership)
        return membership
    if check.state == TelegramMembershipState.unknown:
        logger.warning(
            "SYNC_SKIPPED: user=%s tenant=%s Telegram group membership check is uncertain",
            current_user.id,
            tenant.id,
        )
        return membership

    if membership:
        if membership.status == MemberStatus.paused:
            resulting_role = check.role or membership.role
            if resulting_role == MemberRole.student:
                await ensure_student_capacity(session, tenant)
            else:
                await ensure_tenant_write_entitlement(session, tenant)
            membership.status = MemberStatus.active
            membership.paused_at = None
        if check.role and membership.role == MemberRole.student:
            membership.role = check.role
            membership.role_source = MemberRoleSource.telegram.value
        session.add(membership)
        await session.commit()
        await session.refresh(membership)
        return membership

    role = check.role or MemberRole.student
    if role == MemberRole.student:
        await ensure_student_capacity(session, tenant)
    else:
        await ensure_tenant_write_entitlement(session, tenant)
    new_membership = TenantMember(
        user_id=current_user.id,
        tenant_id=tenant.id,
        role=role,
        role_source=MemberRoleSource.telegram.value,
        status=MemberStatus.active,
    )
    session.add(new_membership)
    await session.commit()
    await session.refresh(new_membership)
    logger.info(
        "SYNC: Created tenant membership from verified Telegram group access user=%s tenant=%s",
        current_user.id,
        tenant.id,
    )
    return new_membership
