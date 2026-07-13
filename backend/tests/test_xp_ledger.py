from datetime import datetime
from types import SimpleNamespace
import uuid

import pytest
from fastapi import BackgroundTasks

from app.models import Lesson, TenantMember, User, XPEvent
from app.services.quizzes import quiz_xp
from app.services.gamification import GamificationService
from app.services.xp_ledger import XPLedgerService


class FakeResult:
    def __init__(self, first_value=None):
        self._first_value = first_value

    def first(self):
        return self._first_value


class FakeTransaction:
    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc, tb):
        return False


class FakeSession:
    def __init__(self, exec_results):
        self._exec_results = list(exec_results)
        self.added = []
        self.flushed = False

    async def exec(self, _statement):
        if not self._exec_results:
            raise AssertionError("Unexpected database query")
        return self._exec_results.pop(0)

    def add(self, item):
        self.added.append(item)

    def begin_nested(self):
        return FakeTransaction()

    async def flush(self):
        self.flushed = True


def member_fixture(**overrides):
    values = {
        "tenant_id": uuid.uuid4(),
        "user_id": uuid.uuid4(),
        "xp": 0,
        "level": 1,
    }
    values.update(overrides)
    return TenantMember(**values)


@pytest.mark.asyncio
async def test_xp_ledger_creates_event_and_updates_member_aggregate():
    member = member_fixture()
    session = FakeSession([FakeResult(None), FakeResult(member)])

    result = await XPLedgerService.award_xp(
        session=session,
        member=member,
        points=20,
        source_type="lesson",
        source_id="lesson-1",
    )

    assert result.granted is True
    assert result.leveled_up is True
    assert member.xp == 20
    assert member.level == 2
    assert session.flushed is True
    event = next(item for item in session.added if isinstance(item, XPEvent))
    assert event.source_type == "lesson"
    assert event.source_id == "lesson-1"
    assert event.points == 20
    assert event.idempotency_key == XPLedgerService.build_idempotency_key(
        tenant_id=member.tenant_id,
        user_id=member.user_id,
        source_type="lesson",
        source_id="lesson-1",
    )


@pytest.mark.asyncio
async def test_xp_ledger_duplicate_key_does_not_update_member_aggregate():
    member = member_fixture(xp=20, level=2)
    key = XPLedgerService.build_idempotency_key(
        tenant_id=member.tenant_id,
        user_id=member.user_id,
        source_type="lesson",
        source_id="lesson-1",
    )
    existing = XPEvent(
        tenant_id=member.tenant_id,
        user_id=member.user_id,
        source_type="lesson",
        source_id="lesson-1",
        points=20,
        idempotency_key=key,
    )
    session = FakeSession([FakeResult(existing)])

    result = await XPLedgerService.award_xp(
        session=session,
        member=member,
        points=20,
        source_type="lesson",
        source_id="lesson-1",
    )

    assert result.granted is False
    assert result.event is existing
    assert member.xp == 20
    assert member.level == 2
    assert session.added == []
    assert session.flushed is False


@pytest.mark.asyncio
async def test_quiz_question_xp_uses_ledger_key_per_first_correct_question(monkeypatch):
    member = member_fixture()
    user = User(id=member.user_id, telegram_id=123, username="student")
    lesson = Lesson(id=uuid.uuid4(), module_id=uuid.uuid4(), title="Lesson")
    question_ids = [uuid.uuid4(), uuid.uuid4(), uuid.uuid4()]
    existing_key = XPLedgerService.build_idempotency_key(
        tenant_id=member.tenant_id,
        user_id=member.user_id,
        source_type=quiz_xp.QUIZ_QUESTION_SOURCE_TYPE,
        source_id=question_ids[0],
    )
    existing_event = XPEvent(
        tenant_id=member.tenant_id,
        user_id=member.user_id,
        source_type=quiz_xp.QUIZ_QUESTION_SOURCE_TYPE,
        source_id=str(question_ids[0]),
        points=quiz_xp.QUIZ_QUESTION_XP_POINTS,
        idempotency_key=existing_key,
    )
    session = FakeSession(
        [
            FakeResult(existing_event),
            FakeResult(None),
            FakeResult(member),
            FakeResult(None),
            FakeResult(member),
        ]
    )

    async def fake_get_lesson_access_state(**_kwargs):
        return SimpleNamespace(membership=member)

    monkeypatch.setattr(quiz_xp, "get_lesson_access_state", fake_get_lesson_access_state)

    award = await quiz_xp.award_quiz_question_xp(
        session=session,
        lesson=lesson,
        correct_question_ids=question_ids,
        background_tasks=BackgroundTasks(),
        current_user=user,
    )

    assert award.xp_granted == 4
    assert award.newly_rewarded_question_ids == question_ids[1:]
    assert award.already_rewarded_question_ids == [question_ids[0]]
    assert member.xp == 4
    assert [
        (event.source_type, event.source_id)
        for event in session.added
        if isinstance(event, XPEvent)
    ] == [
        (quiz_xp.QUIZ_QUESTION_SOURCE_TYPE, str(question_ids[1])),
        (quiz_xp.QUIZ_QUESTION_SOURCE_TYPE, str(question_ids[2])),
    ]


@pytest.mark.asyncio
async def test_message_xp_uses_ledger_key_without_spending_limit_on_duplicate():
    member = member_fixture(hourly_xp_count=19, last_xp_at=datetime.utcnow())
    source_id = "chat-1:message-2"
    session = FakeSession([FakeResult(None), FakeResult(None), FakeResult(member)])

    result = await GamificationService.award_xp(
        session,
        member,
        1,
        source="message",
        source_id=source_id,
    )

    assert result.granted is True
    assert member.xp == 1
    assert member.hourly_xp_count == 20
    event = next(item for item in session.added if isinstance(item, XPEvent))
    assert event.source_type == "message"
    assert event.source_id == source_id

    duplicate_session = FakeSession([FakeResult(event)])
    duplicate = await GamificationService.award_xp(
        duplicate_session,
        member,
        1,
        source="message",
        source_id=source_id,
    )

    assert duplicate.granted is False
    assert member.xp == 1
    assert member.hourly_xp_count == 20
    assert duplicate_session.added == []


@pytest.mark.asyncio
async def test_message_xp_hourly_limit_blocks_new_event():
    member = member_fixture(hourly_xp_count=20, last_xp_at=datetime.utcnow())
    session = FakeSession([FakeResult(None)])

    result = await GamificationService.award_xp(
        session,
        member,
        1,
        source="message",
        source_id="chat-1:message-3",
    )

    assert result.granted is False
    assert member.xp == 0
    assert member.hourly_xp_count == 20
    assert session.added == []
    assert session.flushed is False
