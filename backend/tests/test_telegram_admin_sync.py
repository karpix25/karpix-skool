import uuid
from types import SimpleNamespace

import pytest

from app.models import MemberRole, MemberRoleSource, MemberStatus, Tenant, TenantMember, User
from app.services.telegram import sync_group_admins


class FakeScalars:
    def __init__(self, value):
        self.value = value

    def first(self):
        return self.value


class FakeResult:
    def __init__(self, *, scalar=None, rows=None):
        self.scalar = scalar
        self.rows = rows if rows is not None else []

    def scalars(self):
        return FakeScalars(self.scalar)

    def all(self):
        return self.rows


class FakeSession:
    def __init__(self, results):
        self.results = list(results)
        self.added = []
        self.commit_count = 0

    async def execute(self, _statement):
        if not self.results:
            raise AssertionError("Unexpected database query")
        return self.results.pop(0)

    def add(self, item):
        self.added.append(item)

    async def commit(self):
        self.commit_count += 1


class FakeBot:
    def __init__(self, admins_by_chat=None, failing_chat_id=None):
        self.admins_by_chat = admins_by_chat or {}
        self.failing_chat_id = failing_chat_id

    async def get_chat_administrators(self, chat_id):
        if chat_id == self.failing_chat_id:
            raise RuntimeError("telegram unavailable")
        return self.admins_by_chat.get(chat_id, [])


def telegram_admin(telegram_id: int, username: str):
    return SimpleNamespace(
        user=SimpleNamespace(id=telegram_id, username=username, is_bot=False)
    )


@pytest.mark.asyncio
async def test_admin_sync_promotes_current_and_demotes_removed_admin_without_touching_owner():
    tenant = Tenant(
        id=uuid.uuid4(),
        name="School",
        telegram_group_id=-1001,
        telegram_group_id_vip=-1002,
    )
    current_user = User(id=uuid.uuid4(), telegram_id=101, username="current")
    current_membership = TenantMember(
        tenant_id=tenant.id,
        user_id=current_user.id,
        role=MemberRole.student,
        status=MemberStatus.active,
    )
    removed_user = User(id=uuid.uuid4(), telegram_id=202, username="removed")
    removed_membership = TenantMember(
        tenant_id=tenant.id,
        user_id=removed_user.id,
        role=MemberRole.admin,
        role_source=MemberRoleSource.telegram.value,
        status=MemberStatus.active,
    )
    manual_user = User(id=uuid.uuid4(), telegram_id=404, username="manual")
    manual_membership = TenantMember(
        tenant_id=tenant.id,
        user_id=manual_user.id,
        role=MemberRole.admin,
        role_source=MemberRoleSource.manual.value,
        status=MemberStatus.active,
    )
    owner_user = User(id=uuid.uuid4(), telegram_id=303, username="owner")
    owner_membership = TenantMember(
        tenant_id=tenant.id,
        user_id=owner_user.id,
        role=MemberRole.owner,
        status=MemberStatus.active,
    )
    session = FakeSession(
        [
            FakeResult(scalar=current_user),
            FakeResult(scalar=current_membership),
            FakeResult(rows=[
                (removed_membership, removed_user),
                (manual_membership, manual_user),
                (owner_membership, owner_user),
            ]),
        ]
    )
    bot = FakeBot(
        admins_by_chat={
            -1001: [telegram_admin(101, "current")],
            -1002: [],
        }
    )

    promoted, total = await sync_group_admins(-1001, tenant, session, bot=bot)

    assert promoted == ["current"]
    assert total == 1
    assert current_membership.role == MemberRole.admin
    assert current_membership.role_source == MemberRoleSource.telegram.value
    assert removed_membership.role == MemberRole.student
    assert manual_membership.role == MemberRole.admin
    assert owner_membership.role == MemberRole.owner
    assert session.commit_count == 1
    assert tenant.last_sync_at is not None


@pytest.mark.asyncio
async def test_admin_sync_does_not_change_roles_when_any_linked_group_is_unavailable():
    tenant = Tenant(
        id=uuid.uuid4(),
        name="School",
        telegram_group_id=-1001,
        telegram_group_id_vip=-1002,
    )
    session = FakeSession([])
    bot = FakeBot(
        admins_by_chat={-1001: [telegram_admin(101, "current")]},
        failing_chat_id=-1002,
    )

    promoted, total = await sync_group_admins(-1001, tenant, session, bot=bot)

    assert promoted == []
    assert total == 0
    assert session.added == []
    assert session.commit_count == 0
    assert tenant.last_sync_at is None
