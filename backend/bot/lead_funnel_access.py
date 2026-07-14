from datetime import datetime
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

from sqlalchemy.future import select

from app.config import settings
from app.models import MemberRole, MemberStatus, Tenant, TenantMember, User
from app.services.telegram import TelegramMembershipState, check_user_chat_membership_state
from app.services.bot_entitlements import can_activate_student


MANAGER_ROLES = {MemberRole.owner, MemberRole.admin, MemberRole.moderator}
MEMBERSHIP_NOT_LOADED = object()
GROUP_CHECK_UNAVAILABLE = (
    "Не удалось проверить вступление в группу. "
    "Попробуйте еще раз чуть позже или напишите администратору."
)
GROUP_JOIN_REQUIRED = "Пока не вижу вас в группе. Вступите и нажмите кнопку еще раз."
SCHOOL_LIMIT_REACHED = "Школа временно не принимает новых учеников. Обратитесь к администратору."


async def verify_and_sync_membership(bot, db, user: User, tenant: Tenant) -> bool:
    membership = await get_membership(db, user, tenant)
    if can_bypass_group_check(membership):
        return True

    state = await free_group_membership_state(bot, user.telegram_id, tenant)
    if state == TelegramMembershipState.verified:
        synced = await sync_verified_membership(db, user, tenant, membership=membership)
        return synced is not None
    if state == TelegramMembershipState.denied:
        await pause_membership_if_needed(db, user, tenant, membership=membership)
    return False


async def free_group_membership_state(bot, telegram_id: int | None, tenant: Tenant) -> TelegramMembershipState:
    if not telegram_id or not tenant.telegram_group_id:
        return TelegramMembershipState.unknown
    check = await check_user_chat_membership_state(telegram_id, tenant.telegram_group_id, bot)
    return check.state


async def sync_verified_membership(
    db,
    user: User,
    tenant: Tenant,
    *,
    membership=MEMBERSHIP_NOT_LOADED,
) -> TenantMember | None:
    if membership is MEMBERSHIP_NOT_LOADED:
        membership = await get_membership(db, user, tenant)
    if membership:
        if membership.status == MemberStatus.paused:
            if not await can_activate_student(db, tenant, role=membership.role):
                return None
            membership.status = MemberStatus.active
            membership.paused_at = None
        db.add(membership)
        await db.commit()
        return membership

    if not await can_activate_student(db, tenant):
        return None
    membership = TenantMember(
        user_id=user.id,
        tenant_id=tenant.id,
        role=MemberRole.student,
        status=MemberStatus.active,
    )
    db.add(membership)
    await db.commit()
    return membership


async def pause_membership_if_needed(
    db,
    user: User,
    tenant: Tenant,
    *,
    membership=MEMBERSHIP_NOT_LOADED,
) -> None:
    if membership is MEMBERSHIP_NOT_LOADED:
        membership = await get_membership(db, user, tenant)
    if not membership or membership.status == MemberStatus.paused:
        return
    if can_bypass_group_check(membership):
        return

    membership.status = MemberStatus.paused
    membership.paused_at = datetime.utcnow()
    db.add(membership)
    await db.commit()


async def get_membership(db, user: User, tenant: Tenant) -> TenantMember | None:
    result = await db.execute(
        select(TenantMember).where(
            TenantMember.user_id == user.id,
            TenantMember.tenant_id == tenant.id,
            TenantMember.deleted_at == None,
        )
    )
    return result.scalars().first()


def can_bypass_group_check(membership: TenantMember | None) -> bool:
    return bool(
        membership
        and membership.status == MemberStatus.active
        and membership.role in MANAGER_ROLES
    )


def build_web_app_url(start_param: str) -> str:
    base_url = (settings.WEBAPP_URL or settings.FRONTEND_URL).strip()
    parsed = urlsplit(base_url)
    query = dict(parse_qsl(parsed.query, keep_blank_values=True))
    query["startapp"] = start_param
    return urlunsplit((
        parsed.scheme,
        parsed.netloc,
        parsed.path,
        urlencode(query),
        parsed.fragment,
    ))
