import uuid
from datetime import datetime, timedelta

import pytest

from app.models import (
    Course,
    CourseNotificationDelivery,
    CourseNotificationDeliveryStatus,
    CourseNotificationEventType,
    CourseSubscription,
    Lesson,
    MemberStatus,
    Module,
    Tenant,
    TenantMember,
    UnlockType,
    User,
)
from app.services.course_notifications import notify_lesson_published


class FakeResult:
    def __init__(self, *, first_value=None, all_value=None):
        self._first_value = first_value
        self._all_value = all_value if all_value is not None else []

    def first(self):
        return self._first_value

    def all(self):
        return self._all_value


class FakeSession:
    def __init__(self, objects=None, exec_results=None):
        self._objects = {(type(item), item.id): item for item in objects or []}
        self._exec_results = list(exec_results or [])
        self.added = []
        self.commits = 0
        self.refreshed = []

    async def get(self, model, item_id):
        return self._objects.get((model, item_id))

    async def exec(self, _statement):
        if not self._exec_results:
            raise AssertionError("Unexpected database query")
        return self._exec_results.pop(0)

    def add(self, item):
        self.added.append(item)
        self._objects[(type(item), item.id)] = item

    async def commit(self):
        self.commits += 1

    async def refresh(self, item):
        self.refreshed.append(item)


def notification_context(*, lesson_unlock_type=UnlockType.immediate, lesson_unlock_value=None):
    tenant = Tenant(id=uuid.uuid4(), name="School")
    user = User(id=uuid.uuid4(), telegram_id=123, username="student")
    member = TenantMember(
        tenant_id=tenant.id,
        user_id=user.id,
        status=MemberStatus.active,
        level=1,
    )
    course = Course(id=uuid.uuid4(), tenant_id=tenant.id, title="Course", is_published=True)
    module = Module(id=uuid.uuid4(), course_id=course.id, title="Module")
    lesson = Lesson(
        id=uuid.uuid4(),
        module_id=module.id,
        title="Lesson",
        is_published=True,
        unlock_type=lesson_unlock_type,
        unlock_value=lesson_unlock_value,
    )
    subscription = CourseSubscription(
        tenant_id=tenant.id,
        course_id=course.id,
        user_id=user.id,
        is_active=True,
    )
    return tenant, user, member, course, module, lesson, subscription


@pytest.mark.asyncio
async def test_notify_lesson_published_sends_once_and_marks_delivery_sent(monkeypatch):
    tenant, user, member, course, module, lesson, subscription = notification_context()
    sent = []
    session = FakeSession(
        [tenant, user, member, course, module, lesson, subscription],
        [
            FakeResult(all_value=[(user, member)]),
            FakeResult(first_value=None),
        ],
    )
    monkeypatch.setattr("app.services.deep_links.settings.BOT_USERNAME", "karpix_shkola_bot")
    monkeypatch.setattr("app.services.deep_links.settings.APP_SHORT_NAME", "karpix")

    async def fake_sender(telegram_id, text, button_text, url):
        sent.append((telegram_id, text, button_text, url))

    sent_count = await notify_lesson_published(
        session=session,
        lesson=lesson,
        sender=fake_sender,
    )

    delivery = next(item for item in session.added if isinstance(item, CourseNotificationDelivery))
    assert sent_count == 1
    assert sent == [
        (
            user.telegram_id,
            "В курсе «Course» появился новый урок: «Lesson».",
            "Открыть урок",
            f"https://t.me/karpix_shkola_bot/karpix?startapp=lesson_{lesson.id}",
        )
    ]
    assert delivery.status == CourseNotificationDeliveryStatus.sent
    assert delivery.sent_at is not None
    assert delivery.idempotency_key == f"lesson_published:{lesson.id}:{user.id}"


@pytest.mark.asyncio
async def test_notify_lesson_published_does_not_duplicate_existing_delivery(monkeypatch):
    tenant, user, member, course, module, lesson, subscription = notification_context()
    existing_delivery = CourseNotificationDelivery(
        tenant_id=tenant.id,
        course_id=course.id,
        user_id=user.id,
        event_type=CourseNotificationEventType.lesson_published,
        lesson_id=lesson.id,
        module_id=module.id,
        idempotency_key=f"lesson_published:{lesson.id}:{user.id}",
        status=CourseNotificationDeliveryStatus.sent,
    )
    session = FakeSession(
        [tenant, user, member, course, module, lesson, subscription, existing_delivery],
        [
            FakeResult(all_value=[(user, member)]),
            FakeResult(first_value=existing_delivery),
        ],
    )
    monkeypatch.setattr("app.services.deep_links.settings.BOT_USERNAME", "karpix_shkola_bot")
    monkeypatch.setattr("app.services.deep_links.settings.APP_SHORT_NAME", "karpix")

    async def fake_sender(*_args):
        raise AssertionError("Duplicate delivery must not send a Telegram message")

    sent_count = await notify_lesson_published(
        session=session,
        lesson=lesson,
        sender=fake_sender,
    )

    assert sent_count == 0
    assert session.added == []


@pytest.mark.asyncio
async def test_notify_lesson_published_retries_stale_pending_delivery(monkeypatch):
    tenant, user, member, course, module, lesson, subscription = notification_context()
    existing_delivery = CourseNotificationDelivery(
        tenant_id=tenant.id,
        course_id=course.id,
        user_id=user.id,
        event_type=CourseNotificationEventType.lesson_published,
        lesson_id=lesson.id,
        module_id=module.id,
        idempotency_key=f"lesson_published:{lesson.id}:{user.id}",
        status=CourseNotificationDeliveryStatus.pending,
        created_at=datetime.utcnow() - timedelta(minutes=10),
    )
    sent = []
    session = FakeSession(
        [tenant, user, member, course, module, lesson, subscription, existing_delivery],
        [
            FakeResult(all_value=[(user, member)]),
            FakeResult(first_value=existing_delivery),
        ],
    )
    monkeypatch.setattr("app.services.deep_links.settings.BOT_USERNAME", "karpix_shkola_bot")
    monkeypatch.setattr("app.services.deep_links.settings.APP_SHORT_NAME", "karpix")

    async def fake_sender(*args):
        sent.append(args)

    sent_count = await notify_lesson_published(
        session=session,
        lesson=lesson,
        sender=fake_sender,
    )

    assert sent_count == 1
    assert sent
    assert existing_delivery.status == CourseNotificationDeliveryStatus.sent


@pytest.mark.asyncio
async def test_notify_lesson_published_skips_locked_lesson(monkeypatch):
    tenant, user, member, course, module, lesson, subscription = notification_context(
        lesson_unlock_type=UnlockType.level_based,
        lesson_unlock_value="3",
    )
    session = FakeSession(
        [tenant, user, member, course, module, lesson, subscription],
        [
            FakeResult(all_value=[(user, member)]),
            FakeResult(first_value=None),
        ],
    )
    monkeypatch.setattr("app.services.deep_links.settings.BOT_USERNAME", "karpix_shkola_bot")
    monkeypatch.setattr("app.services.deep_links.settings.APP_SHORT_NAME", "karpix")

    async def fake_sender(*_args):
        raise AssertionError("Locked lessons must not be announced to the student")

    sent_count = await notify_lesson_published(
        session=session,
        lesson=lesson,
        sender=fake_sender,
    )

    delivery = next(item for item in session.added if isinstance(item, CourseNotificationDelivery))
    assert sent_count == 0
    assert delivery.status == CourseNotificationDeliveryStatus.skipped
    assert "3" in delivery.error
