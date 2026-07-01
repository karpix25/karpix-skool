import pytest

from app.services import cache_invalidation
from app.utils import cache


class FakeRedis:
    def __init__(self, batches):
        self._batches = list(batches)
        self.scan_calls = []
        self.deleted_keys = None

    async def scan(self, cursor=0, match=None, count=None):
        self.scan_calls.append({"cursor": cursor, "match": match, "count": count})
        return self._batches.pop(0)

    async def delete(self, *keys):
        self.deleted_keys = keys
        return len(keys)


@pytest.mark.asyncio
async def test_clear_cache_deletes_matching_keys(monkeypatch):
    redis = FakeRedis([(0, ["cache:/courses:one", "cache:/leaderboard:two"])])
    monkeypatch.setattr(cache, "cache_redis", redis)

    await cache.clear_cache("cache:*")

    assert redis.scan_calls == [{"cursor": 0, "match": "cache:*", "count": 500}]
    assert redis.deleted_keys == ("cache:/courses:one", "cache:/leaderboard:two")


@pytest.mark.asyncio
async def test_clear_cache_skips_delete_when_no_keys(monkeypatch):
    redis = FakeRedis([(0, [])])
    monkeypatch.setattr(cache, "cache_redis", redis)

    await cache.clear_cache("cache:*")

    assert redis.scan_calls == [{"cursor": 0, "match": "cache:*", "count": 500}]
    assert redis.deleted_keys is None


def test_cache_invalidation_patterns_are_route_scoped():
    course_id = "85beef2f-1de5-4e7a-a049-54164292d26f"

    assert cache_invalidation.course_cache_patterns(course_id) == [
        "cache:/webapp/courses:*",
        f"cache:/webapp/courses/{course_id}:*",
    ]
    assert cache_invalidation.tenant_cache_patterns("tenant-id") == [
        "cache:/webapp/courses:*",
        "cache:/webapp/leaderboard:*",
    ]
    assert cache_invalidation.user_cache_patterns("user-id") == [
        "cache:/webapp/courses:*",
        "cache:/webapp/courses/*:*",
        "cache:/webapp/leaderboard:*",
    ]


@pytest.mark.asyncio
async def test_lesson_completion_invalidation_dedupes_scoped_patterns(monkeypatch):
    cleared = []

    async def fake_clear_cache(pattern):
        cleared.append(pattern)

    monkeypatch.setattr(cache_invalidation, "clear_cache", fake_clear_cache)

    await cache_invalidation.invalidate_lesson_completion_caches(
        course_id="85beef2f-1de5-4e7a-a049-54164292d26f",
        tenant_id="67ea7b2d-e86d-4531-8929-43ef53f424b8",
        user_id="7ef51754-041c-4404-9e2f-c262cff4c27b",
    )

    assert cleared == [
        "cache:/webapp/courses:*",
        "cache:/webapp/courses/85beef2f-1de5-4e7a-a049-54164292d26f:*",
        "cache:/webapp/leaderboard:*",
        "cache:/webapp/courses/*:*",
    ]
