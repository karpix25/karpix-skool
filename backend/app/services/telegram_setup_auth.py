import logging
from dataclasses import dataclass
from enum import Enum

from sqlalchemy.future import select

from app.models import MemberRole, MemberStatus, Tenant, TenantMember, User


GROUP_ADMIN_STATUSES = {"administrator", "creator"}
TENANT_SETUP_ROLES = (MemberRole.owner, MemberRole.admin)


class SetupAuthFailure(str, Enum):
    not_group_admin = "not_group_admin"
    not_tenant_admin = "not_tenant_admin"


@dataclass(frozen=True)
class SetupAuthorization:
    allowed: bool
    failure: SetupAuthFailure | None = None
    user: User | None = None


async def authorize_group_setup(
    db,
    tenant: Tenant,
    *,
    bot,
    chat_id: int,
    sender_telegram_id: int,
) -> SetupAuthorization:
    if not await is_telegram_group_admin(bot, chat_id, sender_telegram_id):
        return SetupAuthorization(False, SetupAuthFailure.not_group_admin)

    return await authorize_tenant_setup_user(db, tenant, sender_telegram_id)


async def authorize_tenant_setup_user(
    db,
    tenant: Tenant,
    sender_telegram_id: int,
) -> SetupAuthorization:
    user = await get_user_by_telegram_id(db, sender_telegram_id)
    if not user:
        return SetupAuthorization(False, SetupAuthFailure.not_tenant_admin)

    if is_direct_tenant_admin(tenant, user):
        return SetupAuthorization(True, user=user)

    if await has_active_tenant_setup_role(db, tenant, user):
        return SetupAuthorization(True, user=user)

    return SetupAuthorization(False, SetupAuthFailure.not_tenant_admin, user=user)


async def is_telegram_group_admin(bot, chat_id: int, telegram_id: int) -> bool:
    try:
        member = await bot.get_chat_member(chat_id, telegram_id)
    except Exception as exc:
        logging.warning("SETUP AUTH: Telegram admin check failed for chat %s user %s: %s", chat_id, telegram_id, exc)
        return False

    status = getattr(member.status, "value", member.status)
    return status in GROUP_ADMIN_STATUSES


async def get_user_by_telegram_id(db, telegram_id: int) -> User | None:
    result = await db.execute(select(User).where(User.telegram_id == telegram_id))
    return result.scalars().first()


def is_direct_tenant_admin(tenant: Tenant, user: User) -> bool:
    return bool(user.is_super_admin or tenant.owner_user_id == user.id)


async def has_active_tenant_setup_role(db, tenant: Tenant, user: User) -> bool:
    result = await db.execute(
        select(TenantMember).where(
            TenantMember.tenant_id == tenant.id,
            TenantMember.user_id == user.id,
            TenantMember.status == MemberStatus.active,
            TenantMember.deleted_at == None,
            TenantMember.role.in_(TENANT_SETUP_ROLES),
        )
    )
    return result.scalars().first() is not None
