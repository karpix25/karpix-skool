import uuid
from datetime import datetime
from types import SimpleNamespace

import pytest
from fastapi import FastAPI
from fastapi import HTTPException
from fastapi.testclient import TestClient
from sqlmodel import select

from app.db import get_session
from app.models import MemberRole, MemberStatus
from app.routes import webapp
from app.routes.auth import get_current_user
from app.services.webapp.leaderboard import (
    _period_ranking_query,
    build_leaderboard_response,
    get_user_tenant_ids,
)
from app.services.webapp.leaderboard_summary import (
    _build_level_distribution,
    _summary_period_ranking_query,
    build_leaderboard_summary_response,
)
from app.services.xp_ledger import LEVEL_THRESHOLDS


class FakeResult:
    def __init__(self, *, all_value=None, first_value=None):
        self._all_value = all_value if all_value is not None else []
        self._first_value = first_value

    def all(self):
        return self._all_value

    def first(self):
        return self._first_value


class FakeSession:
    def __init__(self, results):
        self._results = list(results)
        self.exec_count = 0

    async def exec(self, _statement):
        self.exec_count += 1
        if not self._results:
            raise AssertionError("Unexpected database query")
        return self._results.pop(0)


def leaderboard_row(*, rank, user_id, username, avatar_url=None, xp=100, level=1):
    return SimpleNamespace(
        rank=rank,
        user_id=user_id,
        username=username,
        avatar_url=avatar_url,
        xp=xp,
        level=level,
    )


def summary_row(
    *,
    rank,
    user_id,
    username,
    avatar_url=None,
    xp_total=100,
    xp_period=None,
    level=1,
):
    return SimpleNamespace(
        rank=rank,
        user_id=user_id,
        username=username,
        avatar_url=avatar_url,
        xp_total=xp_total,
        xp_period=xp_period,
        level=level,
    )


def verified_membership(tenant_id):
    return SimpleNamespace(
        id=uuid.uuid4(),
        tenant_id=tenant_id,
        role=MemberRole.student,
        status=MemberStatus.active,
        tenant=SimpleNamespace(
            id=tenant_id,
            telegram_group_id=None,
            telegram_group_id_vip=None,
        ),
    )


@pytest.mark.asyncio
async def test_leaderboard_returns_empty_shape_without_tenants():
    user = SimpleNamespace(id=uuid.uuid4(), username="me", avatar_url=None)
    session = FakeSession([FakeResult(all_value=[])])

    response = await build_leaderboard_response(session, user, "all", None)

    assert response == {"top_three": [], "others": [], "user_rank": None}


@pytest.mark.asyncio
async def test_leaderboard_returns_ranked_response_shape_for_all_time():
    current_user_id = uuid.uuid4()
    other_user_id = uuid.uuid4()
    tenant_id = uuid.uuid4()
    current_user = SimpleNamespace(id=current_user_id, username="me", avatar_url="me.png")
    other_row = leaderboard_row(rank=1, user_id=other_user_id, username="other", xp=200, level=4)
    current_row = leaderboard_row(
        rank=2,
        user_id=current_user_id,
        username="me",
        avatar_url="me.png",
        xp=120,
        level=3,
    )
    session = FakeSession(
        [
            FakeResult(all_value=[verified_membership(tenant_id)]),
            FakeResult(all_value=[other_row, current_row]),
            FakeResult(first_value=current_row),
        ]
    )

    response = await build_leaderboard_response(session, current_user, "all", None)

    assert set(response) == {"top_three", "others", "user_rank"}
    assert response["top_three"][0]["rank"] == 1
    assert response["top_three"][0]["username"] == "other"
    assert response["user_rank"]["user_id"] == str(current_user_id)
    assert session.exec_count == 3


@pytest.mark.asyncio
async def test_leaderboard_fetches_current_user_outside_visible_top():
    current_user_id = uuid.uuid4()
    tenant_id = uuid.uuid4()
    current_user = SimpleNamespace(id=current_user_id, username="me", avatar_url=None)
    visible_rows = [
        leaderboard_row(rank=index, user_id=uuid.uuid4(), username=f"user-{index}")
        for index in range(1, 14)
    ]
    current_row = leaderboard_row(
        rank=42,
        user_id=current_user_id,
        username="me",
        xp=10,
        level=1,
    )
    session = FakeSession(
        [
            FakeResult(all_value=[verified_membership(tenant_id)]),
            FakeResult(all_value=visible_rows),
            FakeResult(first_value=current_row),
        ]
    )

    response = await build_leaderboard_response(session, current_user, "all", None)

    assert len(response["top_three"]) == 3
    assert len(response["others"]) == 10
    assert response["user_rank"]["rank"] == 42
    assert response["user_rank"]["is_me"] is True


@pytest.mark.asyncio
async def test_leaderboard_rejects_explicit_tenant_without_membership():
    current_user = SimpleNamespace(id=uuid.uuid4(), is_super_admin=False)
    tenant_id = uuid.uuid4()
    session = FakeSession([FakeResult(first_value=None)])

    with pytest.raises(HTTPException) as exc_info:
        await get_user_tenant_ids(session, current_user, tenant_id)

    assert exc_info.value.status_code == 403
    assert session.exec_count == 1


@pytest.mark.asyncio
async def test_leaderboard_allows_super_admin_explicit_tenant_without_membership_query():
    current_user = SimpleNamespace(id=uuid.uuid4(), is_super_admin=True)
    tenant_id = uuid.uuid4()
    session = FakeSession([])

    tenant_ids = await get_user_tenant_ids(session, current_user, tenant_id)

    assert tenant_ids == [tenant_id]
    assert session.exec_count == 0


def test_period_leaderboard_ranks_by_xp_events_not_lesson_progress():
    ranking_query = _period_ranking_query([uuid.uuid4()], datetime.utcnow())
    sql = str(select(*ranking_query.c)).lower()

    assert "xpevent" in sql
    assert "lessonprogress" not in sql
    assert "xpevent.tenant_id = tenantmember.tenant_id" in sql


@pytest.mark.asyncio
async def test_leaderboard_summary_returns_fixed_periods_and_level_distribution():
    current_user_id = uuid.uuid4()
    other_user_id = uuid.uuid4()
    tenant_id = uuid.uuid4()
    last_updated = datetime(2026, 1, 2, 12, 0, 0)
    current_user = SimpleNamespace(id=current_user_id, username="me", avatar_url="me.png")
    current_all = summary_row(
        rank=2,
        user_id=current_user_id,
        username="me",
        avatar_url="me.png",
        xp_total=120,
        level=3,
    )
    session = FakeSession(
        [
            FakeResult(all_value=[verified_membership(tenant_id)]),
            FakeResult(all_value=[{"1": "Новичок", "3": "Практик"}]),
            FakeResult(first_value=3),
            FakeResult(first_value=last_updated),
            FakeResult(
                all_value=[
                    SimpleNamespace(level=1, member_count=1),
                    SimpleNamespace(level=3, member_count=2),
                ]
            ),
            FakeResult(
                all_value=[
                    summary_row(
                        rank=1,
                        user_id=other_user_id,
                        username="other",
                        xp_total=300,
                        xp_period=80,
                        level=3,
                    ),
                    summary_row(
                        rank=2,
                        user_id=current_user_id,
                        username="me",
                        xp_total=120,
                        xp_period=50,
                        level=3,
                    ),
                ]
            ),
            FakeResult(all_value=[]),
            FakeResult(all_value=[summary_row(rank=1, user_id=other_user_id, username="other", xp_total=300, level=3), current_all]),
            FakeResult(first_value=current_all),
        ]
    )

    response = await build_leaderboard_summary_response(session, current_user, None)

    assert response.last_updated_at == last_updated
    assert response.total_participants == 3
    assert response.current_user.rank == 2
    assert response.current_user.xp_total == 120
    assert response.current_user.next_level == 4
    assert response.current_user.xp_to_next_level == 280
    assert response.current_user.progress_percent == 6.7
    assert response.levels[0].name == "Новичок"
    assert response.levels[0].member_percent == 33.3
    assert response.levels[2].name == "Практик"
    assert response.levels[2].member_count == 2
    assert response.levels[2].member_percent == 66.7
    assert set(response.leaderboards) == {"week", "month", "all"}
    assert response.leaderboards["week"].period.mode == "rolling"
    assert response.leaderboards["week"].period.starts_at is not None
    assert response.leaderboards["week"].items[0].xp_period == 80
    assert response.leaderboards["all"].items[0].xp_period is None
    assert session.exec_count == 9


@pytest.mark.asyncio
async def test_leaderboard_summary_returns_empty_shape_without_tenants():
    user = SimpleNamespace(id=uuid.uuid4(), username="me", avatar_url=None)
    session = FakeSession([FakeResult(all_value=[])])

    response = await build_leaderboard_summary_response(session, user, None)

    assert response.total_participants == 0
    assert response.last_updated_at is None
    assert response.current_user.rank is None
    assert response.current_user.xp_total == 0
    assert [level.level for level in response.levels] == sorted(LEVEL_THRESHOLDS)
    assert all(section.items == [] for section in response.leaderboards.values())
    assert session.exec_count == 1


def test_level_distribution_percentages_are_stable():
    levels = _build_level_distribution({1: 1, 3: 2}, 3, {3: "Практик"})

    assert levels[0].member_percent == 33.3
    assert levels[2].name == "Практик"
    assert levels[2].member_percent == 66.7


def test_summary_period_ranking_uses_xp_events_and_keeps_total_xp():
    ranking_query = _summary_period_ranking_query([uuid.uuid4()], datetime.utcnow())
    sql = str(select(*ranking_query.c)).lower()

    assert "xpevent" in sql
    assert "tenantmember.xp" in sql
    assert "xp_period" in sql


def test_webapp_leaderboard_summary_route_returns_service_response(monkeypatch):
    tenant_id = uuid.uuid4()
    user = SimpleNamespace(id=uuid.uuid4(), username="student", avatar_url=None)
    app = FastAPI()
    app.include_router(webapp.router, prefix="/webapp")

    async def override_session():
        return object()

    async def override_current_user():
        return user

    async def fake_build_leaderboard_summary_response(session, current_user, requested_tenant_id):
        assert session is not None
        assert current_user == user
        assert requested_tenant_id == tenant_id
        now = datetime(2026, 1, 2, 12, 0, 0)
        return {
            "generated_at": now,
            "last_updated_at": None,
            "total_participants": 0,
            "current_user": {
                "rank": None,
                "user_id": user.id,
                "username": "student",
                "avatar_url": None,
                "xp_total": 0,
                "xp_period": None,
                "level": 1,
                "next_level": 2,
                "xp_to_next_level": 20,
                "progress_percent": 0.0,
                "is_me": True,
            },
            "levels": [],
            "leaderboards": {
                "week": {
                    "period": {
                        "key": "week",
                        "label": "7 дней",
                        "starts_at": now,
                        "ends_at": now,
                        "mode": "rolling",
                    },
                    "items": [],
                },
                "month": {
                    "period": {
                        "key": "month",
                        "label": "30 дней",
                        "starts_at": now,
                        "ends_at": now,
                        "mode": "rolling",
                    },
                    "items": [],
                },
                "all": {
                    "period": {
                        "key": "all",
                        "label": "Все время",
                        "starts_at": None,
                        "ends_at": now,
                        "mode": "all_time",
                    },
                    "items": [],
                },
            },
        }

    monkeypatch.setattr(webapp, "build_leaderboard_summary_response", fake_build_leaderboard_summary_response)
    app.dependency_overrides[get_session] = override_session
    app.dependency_overrides[get_current_user] = override_current_user

    response = TestClient(app).get(f"/webapp/leaderboard/summary?tenant_id={tenant_id}")

    assert response.status_code == 200
    assert response.json()["total_participants"] == 0
    assert set(response.json()["leaderboards"]) == {"week", "month", "all"}
