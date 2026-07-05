import uuid
from types import SimpleNamespace

import pytest

from app.models import MemberStatus, Tenant, TenantMember, User
from bot.handlers_start import cmd_start


class FakeScalars:
    def __init__(self, value):
        self.value = value

    def first(self):
        return self.value


class FakeResult:
    def __init__(self, value):
        self.value = value

    def scalars(self):
        return FakeScalars(self.value)


class FakeDb:
    def __init__(self, results):
        self.results = list(results)
        self.added = []
        self.committed = False
        self.refreshed = []

    async def execute(self, _statement):
        if not self.results:
            raise AssertionError("Unexpected database query")
        return FakeResult(self.results.pop(0))

    def add(self, item):
        self.added.append(item)

    async def commit(self):
        self.committed = True

    async def refresh(self, item):
        self.refreshed.append(item)


class FakeBot:
    def __init__(self, status, *, raises=False):
        self.status = status
        self.raises = raises
        self.member_checks = []

    async def get_chat_member(self, chat_id, telegram_id):
        self.member_checks.append((chat_id, telegram_id))
        if self.raises:
            raise RuntimeError("telegram unavailable")
        return SimpleNamespace(status=self.status)


class FakeMessage:
    def __init__(self, *, bot_status="member", bot_raises=False):
        self.from_user = SimpleNamespace(id=123, username="student")
        self.text = "/start START-test"
        self.bot = FakeBot(bot_status, raises=bot_raises)
        self.replies = []
        self.reply_kwargs = []

    async def reply(self, text, **kwargs):
        self.replies.append(text)
        self.reply_kwargs.append(kwargs)


def make_tenant():
    return Tenant(
        id=uuid.uuid4(),
        name="School",
        setup_code="START-test",
        telegram_group_id=-100123,
    )


@pytest.mark.asyncio
async def test_start_does_not_create_membership_when_user_is_not_in_linked_group():
    tenant = make_tenant()
    user = User(id=uuid.uuid4(), telegram_id=123, username="student")
    message = FakeMessage(bot_status="left")
    db = FakeDb([user, tenant, None])

    await cmd_start(message, db)

    assert not any(isinstance(item, TenantMember) for item in db.added)
    assert message.bot.member_checks == [(-100123, 123)]
    assert "Доступ к школе пока не открыт" in message.replies[-1]
    assert not message.reply_kwargs[-1].get("reply_markup")


@pytest.mark.asyncio
async def test_start_creates_membership_when_user_is_in_linked_group():
    tenant = make_tenant()
    user = User(id=uuid.uuid4(), telegram_id=123, username="student")
    message = FakeMessage(bot_status="member")
    db = FakeDb([user, tenant, None])

    await cmd_start(message, db)

    membership = next(item for item in db.added if isinstance(item, TenantMember))
    assert membership.tenant_id == tenant.id
    assert membership.user_id == user.id
    assert membership.status == MemberStatus.active
    assert message.bot.member_checks == [(-100123, 123)]
    assert message.reply_kwargs[-1].get("reply_markup")


@pytest.mark.asyncio
async def test_start_pauses_existing_student_membership_after_leaving_group():
    tenant = make_tenant()
    user = User(id=uuid.uuid4(), telegram_id=123, username="student")
    membership = TenantMember(tenant_id=tenant.id, user_id=user.id, status=MemberStatus.active)
    message = FakeMessage(bot_status="left")
    db = FakeDb([user, tenant, membership])

    await cmd_start(message, db)

    assert membership.status == MemberStatus.paused
    assert membership.paused_at is not None
    assert membership in db.added
    assert "Доступ к школе пока не открыт" in message.replies[-1]


@pytest.mark.asyncio
async def test_start_keeps_existing_membership_when_group_check_is_uncertain():
    tenant = make_tenant()
    user = User(id=uuid.uuid4(), telegram_id=123, username="student")
    membership = TenantMember(tenant_id=tenant.id, user_id=user.id, status=MemberStatus.active)
    message = FakeMessage(bot_raises=True)
    db = FakeDb([user, tenant, membership])

    await cmd_start(message, db)

    assert membership.status == MemberStatus.active
    assert membership not in db.added
    assert message.reply_kwargs[-1].get("reply_markup")


@pytest.mark.asyncio
async def test_start_keeps_existing_membership_when_tenant_has_no_group():
    tenant = Tenant(id=uuid.uuid4(), name="School", setup_code="START-test")
    user = User(id=uuid.uuid4(), telegram_id=123, username="student")
    membership = TenantMember(tenant_id=tenant.id, user_id=user.id, status=MemberStatus.active)
    message = FakeMessage()
    db = FakeDb([user, tenant, membership])

    await cmd_start(message, db)

    assert message.bot.member_checks == []
    assert membership.status == MemberStatus.active
    assert message.reply_kwargs[-1].get("reply_markup")
