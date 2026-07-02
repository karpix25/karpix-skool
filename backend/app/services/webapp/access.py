from datetime import datetime
from typing import Any, Optional
import uuid

from aiogram import Bot
from fastapi import HTTPException
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from ...config import settings
from ...models import CourseUnlockType, MemberStatus, Tenant, TenantMember, User
from ...services.tenant_access import is_tenant_admin
from ...utils.logging_config import logger


async def ensure_active_subscription(tenant_id: uuid.UUID, session: AsyncSession):
    tenant = await session.get(Tenant, tenant_id)
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    if tenant.subscription_status != "active":
        raise HTTPException(
            status_code=402,
            detail="Subscription inactive. Please contact the administrator.",
        )

    if tenant.expires_at and tenant.expires_at < datetime.utcnow():
        raise HTTPException(
            status_code=402,
            detail="Access to this school has expired. Please contact the administrator.",
        )

    return tenant


async def ensure_active_membership(
    user_id: uuid.UUID,
    tenant_id: uuid.UUID,
    session: AsyncSession,
):
    stmt = select(TenantMember).where(
        TenantMember.user_id == user_id,
        TenantMember.tenant_id == tenant_id,
    )
    res = await session.exec(stmt)
    membership = res.first()

    if not membership:
        raise HTTPException(status_code=403, detail="Membership not found.")

    if membership.status == MemberStatus.paused:
        raise HTTPException(
            status_code=403,
            detail="Ваше обучение приостановлено. Пожалуйста, вернитесь в закрытую группу проекта, чтобы восстановить доступ.",
        )
    return membership


async def is_tenant_admin_member(
    tenant_id: uuid.UUID,
    user: User,
    session: AsyncSession,
) -> bool:
    return await is_tenant_admin(tenant_id, user, session)


async def check_vip_membership(user_tg_id: int, tenant: Tenant) -> bool:
    if not tenant.telegram_group_id_vip:
        return False

    bot = Bot(token=settings.BOT_TOKEN)
    try:
        member = await bot.get_chat_member(tenant.telegram_group_id_vip, user_tg_id)
        return member.status in ["member", "administrator", "creator"]
    except Exception as exc:
        logger.error(f"VIP Check Error: {exc}")
        return False
    finally:
        await bot.session.close()


async def check_access(
    item: Any,
    membership: Optional[TenantMember],
    tenant: Tenant,
    user_tg_id: int,
    is_admin: bool = False,
    parent_locked: bool = False,
    parent_reason: Optional[str] = None,
) -> tuple[bool, Optional[str]]:
    if is_admin:
        return False, None

    if parent_locked:
        return True, parent_reason

    if getattr(item, "is_vip", False):
        is_user_vip = await check_vip_membership(user_tg_id, tenant)
        if not is_user_vip:
            return True, "💎 ТОЛЬКО ДЛЯ VIP"

    if not membership:
        return True, "ACCESS DENIED"

    unlock_type = getattr(item, "unlock_type", None)
    unlock_value = getattr(item, "unlock_value", None)

    if unlock_type in ["level_based", CourseUnlockType.level_based]:
        try:
            required = int(unlock_value or 0)
            if membership.level < required:
                return True, f"🔒 Доступ с {required} ур."
        except (ValueError, TypeError):
            pass

    if unlock_type in ["time_relative", CourseUnlockType.time_relative]:
        try:
            val_str = str(unlock_value or "0")
            if val_str.endswith("m"):
                months = int(val_str[:-1])
                days = months * 30
                display_unit = "мес."
                display_val = months
            else:
                days = int(val_str)
                display_unit = "дн."
                display_val = days

            if (datetime.utcnow() - membership.joined_at).days < days:
                return True, f"⏳ Через {display_val} {display_unit}"
        except (ValueError, TypeError):
            pass

    if unlock_type == CourseUnlockType.private:
        return True, "PRIVATE"

    return False, None
