import uuid
from datetime import datetime, timedelta
from types import SimpleNamespace

import pytest

from app.models import MemberRole, MemberStatus, Tenant, TenantMember, TenantSetupScope, TenantSetupToken, User, UserAdminStatus
from app.services.tenant_setup_tokens import hash_setup_token
from bot.handlers_setup import _ensure_owner, cmd_setup


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
    def __init__(self, results, by_id=None):
        self.results = list(results)
        self.by_id = by_id or {}
        self.added = []
        self.committed = False
        self.refreshed = []

    async def execute(self, _statement):
        if not self.results:
            raise AssertionError("Unexpected database query")
        return FakeResult(self.results.pop(0))

    def add(self, item):
        self.added.append(item)

    async def get(self, _model, item_id):
        return self.by_id.get(item_id)

    async def commit(self):
        self.committed = True

    async def refresh(self, item):
        self.refreshed.append(item)


class FakeMessage:
    def __init__(
        self,
        telegram_id=123,
        username="owner",
        text="/setup START-test",
        chat_id=-100123,
        chat_type="private",
        chat_username=None,
        bot=None,
        sender_chat=None,
    ):
        self.from_user = SimpleNamespace(
            id=telegram_id,
            username=username,
            full_name="Owner",
        )
        self.text = text
        self.chat = SimpleNamespace(id=chat_id, type=chat_type, username=chat_username)
        self.bot = bot or FakeBot()
        self.sender_chat = sender_chat
        self.is_topic_message = False
        self.message_thread_id = None
        self.replies = []
        self.reply_kwargs = []

    async def reply(self, text, **kwargs):
        self.replies.append(text)
        self.reply_kwargs.append(kwargs)


class FakeBot:
    def __init__(self, member_status="administrator"):
        self.member_status = member_status
        self.member_checks = []

    async def get_chat_member(self, chat_id, telegram_id):
        self.member_checks.append((chat_id, telegram_id))
        return SimpleNamespace(status=self.member_status)


@pytest.mark.asyncio
async def test_setup_owner_assignment_creates_owner_membership_without_admin_approval():
    tenant = Tenant(id=uuid.uuid4(), name="School")
    user = User(
        id=uuid.uuid4(),
        telegram_id=123,
        username="owner",
        admin_status=UserAdminStatus.none,
    )
    db = FakeDb([user, None])

    owner_assigned = await _ensure_owner(FakeMessage(), db, tenant, is_private=True)

    membership = next(item for item in db.added if isinstance(item, TenantMember))
    assert owner_assigned is True
    assert tenant.owner_user_id == user.id
    assert user.admin_status == UserAdminStatus.none
    assert membership.tenant_id == tenant.id
    assert membership.user_id == user.id
    assert membership.role == MemberRole.owner
    assert membership.status == MemberStatus.active
    assert membership.is_onboarded is True


@pytest.mark.asyncio
async def test_setup_owner_assignment_updates_existing_membership_to_owner():
    tenant = Tenant(id=uuid.uuid4(), name="School")
    user = User(id=uuid.uuid4(), telegram_id=123, username="owner")
    membership = TenantMember(
        tenant_id=tenant.id,
        user_id=user.id,
        role=MemberRole.student,
        status=MemberStatus.paused,
        is_onboarded=False,
        paused_at=datetime.utcnow(),
        deleted_at=datetime.utcnow(),
    )
    db = FakeDb([user, membership])

    owner_assigned = await _ensure_owner(FakeMessage(), db, tenant, is_private=True)

    assert owner_assigned is True
    assert membership in db.added
    assert membership.role == MemberRole.owner
    assert membership.status == MemberStatus.active
    assert membership.is_onboarded is True
    assert membership.paused_at is None
    assert membership.deleted_at is None


@pytest.mark.asyncio
async def test_group_setup_rejects_sender_who_is_not_telegram_admin():
    owner = User(id=uuid.uuid4(), telegram_id=123, username="owner")
    tenant = Tenant(
        id=uuid.uuid4(),
        name="School",
        setup_code="START-test",
        owner_user_id=owner.id,
    )
    bot = FakeBot(member_status="member")
    message = FakeMessage(bot=bot, chat_type="supergroup")
    db = FakeDb([tenant])

    await cmd_setup(message, db, tenant=None)

    assert tenant.telegram_group_id is None
    assert db.committed is False
    assert bot.member_checks == [(-100123, 123)]
    assert "Telegram owner/admin" in message.replies[-1]


@pytest.mark.asyncio
async def test_group_setup_rejects_sender_without_tenant_admin_role():
    tenant = Tenant(
        id=uuid.uuid4(),
        name="School",
        setup_code="START-test",
        owner_user_id=uuid.uuid4(),
    )
    intruder = User(id=uuid.uuid4(), telegram_id=123, username="intruder")
    message = FakeMessage(bot=FakeBot(member_status="administrator"), chat_type="supergroup")
    db = FakeDb([tenant, intruder, None])

    await cmd_setup(message, db, tenant=None)

    assert tenant.telegram_group_id is None
    assert db.committed is False
    assert "не является owner/admin" in message.replies[-1]


@pytest.mark.asyncio
async def test_group_setup_binds_when_sender_is_tenant_owner_and_group_admin():
    owner = User(id=uuid.uuid4(), telegram_id=123, username="owner")
    tenant = Tenant(
        id=uuid.uuid4(),
        name="School",
        setup_code="START-test",
        owner_user_id=owner.id,
    )
    message = FakeMessage(bot=FakeBot(member_status="administrator"), chat_type="supergroup")
    db = FakeDb([tenant, owner])

    await cmd_setup(message, db, tenant=None)

    assert tenant.telegram_group_id == -100123
    assert db.committed is True
    assert tenant in db.added
    assert "СВЯЗАНО" in message.replies[-1]


@pytest.mark.asyncio
async def test_group_setup_reply_escapes_tenant_name_with_markdown_v2():
    owner = User(id=uuid.uuid4(), telegram_id=123, username="owner")
    tenant = Tenant(
        id=uuid.uuid4(),
        name="School_*[A]",
        setup_code="START-test",
        owner_user_id=owner.id,
    )
    message = FakeMessage(bot=FakeBot(member_status="administrator"), chat_type="supergroup")
    db = FakeDb([tenant, owner])

    await cmd_setup(message, db, tenant=None)

    assert "School\\_\\*\\[A\\]" in message.replies[-1]
    assert message.reply_kwargs[-1]["parse_mode"] == "MarkdownV2"


@pytest.mark.asyncio
async def test_group_setup_accepts_scoped_free_setup_token_and_marks_used():
    owner = User(id=uuid.uuid4(), telegram_id=123, username="owner")
    tenant = Tenant(
        id=uuid.uuid4(),
        name="School",
        owner_user_id=owner.id,
    )
    raw_token = "SETUP2-free-token"
    setup_token = TenantSetupToken(
        tenant_id=tenant.id,
        token_hash=hash_setup_token(raw_token),
        scope=TenantSetupScope.free_group_link,
        expires_at=datetime.utcnow() + timedelta(days=1),
    )
    message = FakeMessage(
        text=f"/setup {raw_token}",
        bot=FakeBot(member_status="administrator"),
        chat_type="supergroup",
    )
    db = FakeDb([None, setup_token, owner], by_id={tenant.id: tenant})

    await cmd_setup(message, db, tenant=None)

    assert tenant.telegram_group_id == -100123
    assert setup_token.used_at is not None
    assert setup_token in db.added
    assert db.committed is True
    assert "СВЯЗАНО" in message.replies[-1]


@pytest.mark.asyncio
async def test_group_setup_stores_public_free_group_link():
    owner = User(id=uuid.uuid4(), telegram_id=123, username="owner")
    tenant = Tenant(
        id=uuid.uuid4(),
        name="School",
        setup_code="START-test",
        owner_user_id=owner.id,
    )
    message = FakeMessage(
        bot=FakeBot(member_status="administrator"),
        chat_type="supergroup",
        chat_username="aikarlo",
    )
    db = FakeDb([tenant, owner])

    await cmd_setup(message, db, tenant=None)

    assert tenant.telegram_group_id == -100123
    assert tenant.free_group_link == "https://t.me/aikarlo"
    assert db.committed is True


@pytest.mark.asyncio
async def test_group_setup_rejects_owner_invite_token_wrong_scope():
    tenant = Tenant(
        id=uuid.uuid4(),
        name="School",
        owner_user_id=uuid.uuid4(),
    )
    raw_token = "SETUP2-owner-token"
    setup_token = TenantSetupToken(
        tenant_id=tenant.id,
        token_hash=hash_setup_token(raw_token),
        scope=TenantSetupScope.owner_invite,
        expires_at=datetime.utcnow() + timedelta(days=1),
    )
    message = FakeMessage(
        text=f"/setup {raw_token}",
        bot=FakeBot(member_status="administrator"),
        chat_type="supergroup",
    )
    db = FakeDb([None, setup_token], by_id={tenant.id: tenant})

    await cmd_setup(message, db, tenant=None)

    assert tenant.telegram_group_id is None
    assert setup_token.used_at is None
    assert db.committed is False
    assert "не подходит" in message.replies[-1]
