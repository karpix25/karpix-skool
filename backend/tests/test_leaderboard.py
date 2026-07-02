import uuid
from datetime import datetime
from types import SimpleNamespace

import pytest
from fastapi import HTTPException
from sqlmodel import select

from app.services.webapp.leaderboard import (
    _period_ranking_query,
    build_leaderboard_response,
    get_user_tenant_ids,
)


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
            FakeResult(all_value=[tenant_id]),
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
            FakeResult(all_value=[tenant_id]),
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
