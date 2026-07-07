import uuid
from types import SimpleNamespace

import pytest

from app.config import settings
from app.models import Course, Lesson, MemberRole, MemberStatus, Module, Tenant, TenantMember, User
from bot.handlers_start import cmd_start, on_lesson_check
from bot.lesson_funnel import lesson_check_callback_data


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
    def __init__(self, results, objects=None):
        self.results = list(results)
        self.objects = {(type(item), item.id): item for item in (objects or [])}
        self.added = []
        self.committed = False
        self.refreshed = []

    async def execute(self, _statement):
        if not self.results:
            raise AssertionError("Unexpected database query")
        return FakeResult(self.results.pop(0))

    async def get(self, model, item_id):
        return self.objects.get((model, item_id))

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
    def __init__(self, *, bot_status="member", bot_raises=False, text="/start START-test"):
        self.from_user = SimpleNamespace(id=123, username="student")
        self.text = text
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


def make_lesson_funnel_context():
    tenant = make_tenant()
    tenant.free_group_link = "https://t.me/free_school"
    course = Course(id=uuid.uuid4(), tenant_id=tenant.id, title="Course", is_published=True)
    module = Module(id=uuid.uuid4(), course_id=course.id, title="Module")
    lesson = Lesson(id=uuid.uuid4(), module_id=module.id, title="Lesson", is_published=True)
    return tenant, course, module, lesson


class FakeCallback:
    def __init__(self, *, lesson_id, bot_status="member"):
        self.from_user = SimpleNamespace(id=123, username="student")
        self.data = lesson_check_callback_data(lesson_id)
        self.bot = FakeBot(bot_status)
        self.message = FakeMessage(bot_status=bot_status)
        self.answers = []

    async def answer(self, text=None, **kwargs):
        self.answers.append((text, kwargs))


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
async def test_start_lesson_link_shows_join_offer_for_non_member(monkeypatch):
    monkeypatch.setattr(settings, "BOT_USERNAME", "karpix_shkola_bot")
    monkeypatch.setattr(settings, "APP_SHORT_NAME", "karpix")
    tenant, course, module, lesson = make_lesson_funnel_context()
    user = User(id=uuid.uuid4(), telegram_id=123, username="student")
    message = FakeMessage(bot_status="left", text=f"/start lesson_{lesson.id}")
    db = FakeDb([user, None], objects=[tenant, course, module, lesson])

    await cmd_start(message, db)

    assert not any(isinstance(item, TenantMember) for item in db.added)
    assert message.bot.member_checks == [(-100123, 123)]
    assert "Урок: Lesson" in message.replies[-1]
    keyboard = message.reply_kwargs[-1]["reply_markup"].inline_keyboard
    assert keyboard[0][0].url == "https://t.me/free_school"
    assert keyboard[1][0].callback_data == lesson_check_callback_data(lesson.id)


@pytest.mark.asyncio
async def test_start_lesson_link_sends_lesson_immediately_for_member(monkeypatch):
    monkeypatch.setattr(settings, "BOT_USERNAME", "karpix_shkola_bot")
    monkeypatch.setattr(settings, "APP_SHORT_NAME", "karpix")
    monkeypatch.setattr(settings, "WEBAPP_URL", "https://webapp.karpix.com")
    tenant, course, module, lesson = make_lesson_funnel_context()
    user = User(id=uuid.uuid4(), telegram_id=123, username="student")
    message = FakeMessage(bot_status="member", text=f"/start lesson_{lesson.id}")
    db = FakeDb([user, None], objects=[tenant, course, module, lesson])

    await cmd_start(message, db)

    membership = next(item for item in db.added if isinstance(item, TenantMember))
    assert membership.tenant_id == tenant.id
    assert membership.user_id == user.id
    assert "Открывайте урок: Lesson" in message.replies[-1]
    keyboard = message.reply_kwargs[-1]["reply_markup"].inline_keyboard
    assert keyboard[0][0].web_app.url == f"https://webapp.karpix.com?startapp=lesson_{lesson.id}"


@pytest.mark.asyncio
async def test_start_lesson_link_allows_active_admin_without_group_check(monkeypatch):
    monkeypatch.setattr(settings, "BOT_USERNAME", "karpix_shkola_bot")
    monkeypatch.setattr(settings, "APP_SHORT_NAME", "karpix")
    monkeypatch.setattr(settings, "WEBAPP_URL", "https://webapp.karpix.com")
    tenant, course, module, lesson = make_lesson_funnel_context()
    user = User(id=uuid.uuid4(), telegram_id=123, username="admin")
    membership = TenantMember(
        tenant_id=tenant.id,
        user_id=user.id,
        role=MemberRole.admin,
        status=MemberStatus.active,
    )
    message = FakeMessage(bot_status="left", text=f"/start lesson_{lesson.id}")
    db = FakeDb([user, membership], objects=[tenant, course, module, lesson])

    await cmd_start(message, db)

    assert message.bot.member_checks == []
    assert membership.status == MemberStatus.active
    assert "Открывайте урок: Lesson" in message.replies[-1]
    keyboard = message.reply_kwargs[-1]["reply_markup"].inline_keyboard
    assert keyboard[0][0].web_app.url == f"https://webapp.karpix.com?startapp=lesson_{lesson.id}"


@pytest.mark.asyncio
async def test_lesson_check_callback_sends_link_after_join(monkeypatch):
    monkeypatch.setattr(settings, "BOT_USERNAME", "karpix_shkola_bot")
    monkeypatch.setattr(settings, "APP_SHORT_NAME", "karpix")
    monkeypatch.setattr(settings, "WEBAPP_URL", "https://webapp.karpix.com")
    tenant, course, module, lesson = make_lesson_funnel_context()
    user = User(id=uuid.uuid4(), telegram_id=123, username="student")
    callback = FakeCallback(lesson_id=lesson.id, bot_status="member")
    db = FakeDb([user, None], objects=[tenant, course, module, lesson])

    await on_lesson_check(callback, db)

    membership = next(item for item in db.added if isinstance(item, TenantMember))
    assert membership.tenant_id == tenant.id
    assert callback.answers[-1][0] == "Готово"
    assert "Открывайте урок: Lesson" in callback.message.replies[-1]
    keyboard = callback.message.reply_kwargs[-1]["reply_markup"].inline_keyboard
    assert keyboard[0][0].web_app.url == f"https://webapp.karpix.com?startapp=lesson_{lesson.id}"


@pytest.mark.asyncio
async def test_lesson_check_callback_does_not_send_link_before_join(monkeypatch):
    monkeypatch.setattr(settings, "BOT_USERNAME", "karpix_shkola_bot")
    monkeypatch.setattr(settings, "APP_SHORT_NAME", "karpix")
    tenant, course, module, lesson = make_lesson_funnel_context()
    user = User(id=uuid.uuid4(), telegram_id=123, username="student")
    callback = FakeCallback(lesson_id=lesson.id, bot_status="left")
    db = FakeDb([user, None], objects=[tenant, course, module, lesson])

    await on_lesson_check(callback, db)

    assert not any(isinstance(item, TenantMember) for item in db.added)
    assert callback.message.replies == []
    assert "Пока не вижу вас в группе" in callback.answers[-1][0]
    assert callback.answers[-1][1]["show_alert"] is True


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
