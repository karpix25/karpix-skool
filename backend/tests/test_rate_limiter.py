from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.utils import rate_limiter
from app.utils.rate_limiter import RateLimitMiddleware


class FailingRedis:
    def pipeline(self):
        return FailingPipeline()


class FailingPipeline:
    async def incr(self, _key):
        return None

    async def expire(self, *_args, **_kwargs):
        return None

    async def execute(self):
        raise RuntimeError("redis down")


def _app_with_failing_redis(monkeypatch):
    monkeypatch.setattr(rate_limiter.redis, "from_url", lambda *_args, **_kwargs: FailingRedis())

    app = FastAPI()
    app.add_middleware(RateLimitMiddleware, limit=300, window=60)

    @app.post("/auth/dev-login")
    async def dev_login():
        return {"ok": True}

    @app.get("/public")
    async def public():
        return {"ok": True}

    return app


def test_sensitive_endpoint_uses_local_fallback_when_redis_fails(monkeypatch):
    client = TestClient(_app_with_failing_redis(monkeypatch))

    for index in range(5):
        response = client.post(
            "/auth/dev-login",
            headers={"x-forwarded-for": f"198.51.100.{index}"},
        )
        assert response.status_code == 200

    response = client.post(
        "/auth/dev-login",
        headers={"x-forwarded-for": "198.51.100.250"},
    )

    assert response.status_code == 429


def test_non_sensitive_endpoint_allows_request_when_redis_fails(monkeypatch):
    client = TestClient(_app_with_failing_redis(monkeypatch))

    response = client.get("/public")

    assert response.status_code == 200
