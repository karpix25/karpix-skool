import uuid

import sqlalchemy as sa
from fastapi import HTTPException
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from ..models import MemberRole, MemberStatus, Tenant, TenantMember, User
from ..schemas.team import TeamMemberRead


TEAM_ROLES = (MemberRole.owner, MemberRole.admin)
ASSIGNABLE_TEAM_ROLES = (MemberRole.admin,)
ROLE_UPDATE_TARGETS = (*ASSIGNABLE_TEAM_ROLES, MemberRole.student)


def to_team_member_read(member: TenantMember, user: User) -> TeamMemberRead:
    return TeamMemberRead(
        id=member.id,
        user_id=user.id,
        username=user.username,
        telegram_id=user.telegram_id,
        avatar_url=user.avatar_url,
        role=member.role,
        status=member.status,
        joined_at=member.joined_at,
        xp=member.xp,
        level=member.level,
    )


async def ensure_super_admin_team_access(
    tenant_id: uuid.UUID,
    current_user: User,
    session: AsyncSession,
) -> Tenant:
    tenant = await session.get(Tenant, tenant_id)
    if not tenant or tenant.deleted_at:
        raise HTTPException(status_code=404, detail="Tenant not found")

    if current_user.is_super_admin:
        return tenant

    raise HTTPException(
        status_code=403,
        detail="Only super admin can manage school team and settings.",
    )


async def list_team_members(
    tenant_id: uuid.UUID,
    session: AsyncSession,
) -> list[TeamMemberRead]:
    stmt = (
        select(TenantMember, User)
        .where(
            TenantMember.tenant_id == tenant_id,
            TenantMember.deleted_at == None,
            TenantMember.role.in_(TEAM_ROLES),
        )
        .join(User, TenantMember.user_id == User.id)
        .order_by(
            sa.case(
                (TenantMember.role == MemberRole.owner, 0),
                (TenantMember.role == MemberRole.admin, 1),
                else_=2,
            ),
            TenantMember.joined_at.asc(),
        )
    )
    result = await session.exec(stmt)
    return [to_team_member_read(member, user) for member, user in result.all()]


async def add_team_member(
    tenant_id: uuid.UUID,
    identifier: str,
    role: MemberRole,
    current_user: User,
    session: AsyncSession,
) -> TeamMemberRead:
    await ensure_super_admin_team_access(tenant_id, current_user, session)
    _ensure_assignable_role(role)

    user = await _find_or_create_user(identifier, session)
    member = await _get_or_create_member(tenant_id, user.id, session)

    if member.role == MemberRole.owner:
        return to_team_member_read(member, user)

    member.role = role
    member.status = MemberStatus.active
    member.paused_at = None
    member.deleted_at = None
    session.add(member)
    await session.commit()
    await session.refresh(member)
    await session.refresh(user)
    return to_team_member_read(member, user)


async def update_team_member_role(
    tenant_id: uuid.UUID,
    member_id: uuid.UUID,
    role: MemberRole,
    current_user: User,
    session: AsyncSession,
) -> TeamMemberRead:
    await ensure_super_admin_team_access(tenant_id, current_user, session)
    if role not in ROLE_UPDATE_TARGETS:
        raise HTTPException(status_code=400, detail="This role cannot be assigned here.")

    member, user = await _get_member_with_user(tenant_id, member_id, session)
    if member.role == MemberRole.owner:
        raise HTTPException(status_code=400, detail="Owner role cannot be changed here.")
    if member.user_id == current_user.id and not current_user.is_super_admin:
        raise HTTPException(status_code=400, detail="You cannot change your own team role.")

    member.role = role
    if role in ASSIGNABLE_TEAM_ROLES:
        member.status = MemberStatus.active
        member.paused_at = None
    session.add(member)
    await session.commit()
    await session.refresh(member)
    return to_team_member_read(member, user)


async def revoke_team_member_role(
    tenant_id: uuid.UUID,
    member_id: uuid.UUID,
    current_user: User,
    session: AsyncSession,
) -> TeamMemberRead:
    return await update_team_member_role(
        tenant_id,
        member_id,
        MemberRole.student,
        current_user,
        session,
    )


def _ensure_assignable_role(role: MemberRole) -> None:
    if role not in ASSIGNABLE_TEAM_ROLES:
        raise HTTPException(status_code=400, detail="Only admin can be assigned.")


async def _find_or_create_user(identifier: str, session: AsyncSession) -> User:
    cleaned = identifier.strip().lstrip("@")
    if not cleaned:
        raise HTTPException(status_code=400, detail="User identifier is required.")

    telegram_id = _parse_telegram_id(cleaned)
    if telegram_id is not None:
        result = await session.exec(select(User).where(User.telegram_id == telegram_id))
        user = result.first()
        if user:
            return user

        user = User(telegram_id=telegram_id, username=f"User_{telegram_id}")
        session.add(user)
        await session.commit()
        await session.refresh(user)
        return user

    result = await session.exec(
        select(User).where(sa.func.lower(User.username) == cleaned.lower())
    )
    user = result.first()
    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found. Ask them to open the bot once or use Telegram ID.",
        )
    return user


def _parse_telegram_id(value: str) -> int | None:
    if not value.isdigit():
        return None
    try:
        telegram_id = int(value)
    except ValueError:
        return None
    if telegram_id <= 0 or telegram_id > 9_223_372_036_854_775_807:
        raise HTTPException(status_code=400, detail="Telegram ID is invalid.")
    return telegram_id


async def _get_or_create_member(
    tenant_id: uuid.UUID,
    user_id: uuid.UUID,
    session: AsyncSession,
) -> TenantMember:
    result = await session.exec(
        select(TenantMember).where(
            TenantMember.tenant_id == tenant_id,
            TenantMember.user_id == user_id,
        )
    )
    member = result.first()
    if member:
        return member

    member = TenantMember(
        tenant_id=tenant_id,
        user_id=user_id,
        role=MemberRole.student,
        status=MemberStatus.active,
    )
    session.add(member)
    await session.commit()
    await session.refresh(member)
    return member


async def _get_member_with_user(
    tenant_id: uuid.UUID,
    member_id: uuid.UUID,
    session: AsyncSession,
) -> tuple[TenantMember, User]:
    stmt = (
        select(TenantMember, User)
        .where(
            TenantMember.id == member_id,
            TenantMember.tenant_id == tenant_id,
            TenantMember.deleted_at == None,
        )
        .join(User, TenantMember.user_id == User.id)
    )
    result = await session.exec(stmt)
    row = result.first()
    if not row:
        raise HTTPException(status_code=404, detail="Team member not found.")
    return row
