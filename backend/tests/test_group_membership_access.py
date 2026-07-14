import uuid

import pytest

from app.models import MemberRole, MemberStatus, Tenant, TenantMember, User
from app.services.telegram import TelegramMembershipCheck, TelegramMembershipState
from app.services.webapp import group_membership


class FakeSession:
    def __init__(self):
        self.added = []
        self.committed = False
        self.refreshed = []

    def add(self, item):
        self.added.append(item)

    async def commit(self):
        self.committed = True

    async def refresh(self, item):
        self.refreshed.append(item)


def make_context(*, role=MemberRole.student):
    tenant = Tenant(id=uuid.uuid4(), name="School", telegram_group_id=-100123)
    user = User(id=uuid.uuid4(), telegram_id=123, username="student")
    membership = TenantMember(
        tenant_id=tenant.id,
        user_id=user.id,
        role=role,
        status=MemberStatus.active,
    )
    return tenant, user, membership


@pytest.mark.asyncio
async def test_group_access_pauses_stale_student_membership(monkeypatch):
    tenant, user, membership = make_context()
    session = FakeSession()

    async def fake_check_user_membership_state(_telegram_id, _tenant):
        return TelegramMembershipCheck(TelegramMembershipState.denied)

    monkeypatch.setattr(group_membership, "check_user_membership_state", fake_check_user_membership_state)

    has_access = await group_membership.has_current_learning_group_access(
        session=session,
        current_user=user,
        tenant=tenant,
        membership=membership,
    )

    assert has_access is False
    assert membership.status == MemberStatus.paused
    assert membership.paused_at is not None
    assert membership in session.added
    assert session.committed is True


@pytest.mark.asyncio
async def test_group_access_bypasses_tenant_manager_membership(monkeypatch):
    tenant, user, membership = make_context(role=MemberRole.admin)
    session = FakeSession()

    async def fail_if_called(_telegram_id, _tenant):
        raise AssertionError("Tenant managers should not require Telegram membership check")

    monkeypatch.setattr(group_membership, "check_user_membership_state", fail_if_called)

    assert await group_membership.has_current_learning_group_access(
        session=session,
        current_user=user,
        tenant=tenant,
        membership=membership,
    ) is True
    assert session.committed is False


@pytest.mark.asyncio
async def test_sync_membership_from_groups_creates_member_only_when_telegram_verified(monkeypatch):
    tenant, user, _membership = make_context()
    session = FakeSession()

    async def fake_check_user_membership_state(_telegram_id, _tenant):
        return TelegramMembershipCheck(TelegramMembershipState.verified, MemberRole.student)

    async def allow_student_activation(_session, checked_tenant):
        assert checked_tenant.id == tenant.id

    monkeypatch.setattr(group_membership, "check_user_membership_state", fake_check_user_membership_state)
    monkeypatch.setattr(group_membership, "ensure_student_capacity", allow_student_activation)

    membership = await group_membership.sync_membership_from_telegram_groups(
        session=session,
        current_user=user,
        tenant=tenant,
        membership=None,
    )

    assert membership is not None
    assert membership.status == MemberStatus.active
    assert membership.tenant_id == tenant.id
    assert membership.user_id == user.id
    assert membership in session.added
    assert session.committed is True
    assert membership in session.refreshed


@pytest.mark.asyncio
async def test_sync_membership_from_groups_pauses_existing_student_when_not_verified(monkeypatch):
    tenant, user, membership = make_context()
    session = FakeSession()

    async def fake_check_user_membership_state(_telegram_id, _tenant):
        return TelegramMembershipCheck(TelegramMembershipState.denied)

    monkeypatch.setattr(group_membership, "check_user_membership_state", fake_check_user_membership_state)

    synced_membership = await group_membership.sync_membership_from_telegram_groups(
        session=session,
        current_user=user,
        tenant=tenant,
        membership=membership,
    )

    assert synced_membership is membership
    assert membership.status == MemberStatus.paused
    assert membership.paused_at is not None
    assert membership in session.added
    assert session.committed is True


@pytest.mark.asyncio
async def test_group_access_keeps_membership_when_telegram_check_is_uncertain(monkeypatch):
    tenant, user, membership = make_context()
    session = FakeSession()

    async def fake_check_user_membership_state(_telegram_id, _tenant):
        return TelegramMembershipCheck(TelegramMembershipState.unknown)

    monkeypatch.setattr(group_membership, "check_user_membership_state", fake_check_user_membership_state)

    has_access = await group_membership.has_current_learning_group_access(
        session=session,
        current_user=user,
        tenant=tenant,
        membership=membership,
    )

    assert has_access is True
    assert membership.status == MemberStatus.active
    assert session.committed is False
