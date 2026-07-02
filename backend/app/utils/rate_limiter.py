import asyncio
import time
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse
import redis.asyncio as redis
from ..config import settings
from ..utils.logging_config import logger
from .client_ip import client_ip_from_request, parse_trusted_proxy_cidrs

# Stricter limits for sensitive endpoints (brute-force protection)
AUTH_RATE_LIMITS = {
    "/auth/login": 15,
    "/auth/register": 15,
    "/auth/login/telegram": 15,
    "/auth/dev-login": 5,
    "/webapp/login": 30,
    "/leads/apply": 5,
}


AUTH_FALLBACK_LIMIT = 15
SENSITIVE_EXACT_PATHS = {"/webapp/login", "/leads/apply"}
RATE_LIMIT_EXEMPT_PATHS = {"/", "/health"}


class InMemoryRateLimitStore:
    def __init__(self, window: int):
        self.window = window
        self._hits: dict[str, tuple[int, float]] = {}
        self._lock = asyncio.Lock()

    async def increment(self, key: str) -> int:
        now = time.monotonic()
        async with self._lock:
            count, expires_at = self._hits.get(key, (0, now + self.window))
            if expires_at <= now:
                count = 0
                expires_at = now + self.window

            count += 1
            self._hits[key] = (count, expires_at)
            self._prune_expired(now)
            return count

    def _prune_expired(self, now: float):
        expired_keys = [key for key, (_, expires_at) in self._hits.items() if expires_at <= now]
        for key in expired_keys:
            del self._hits[key]


def rate_limit_for_path(path: str, default_limit: int) -> int:
    if path in AUTH_RATE_LIMITS:
        return AUTH_RATE_LIMITS[path]
    if path.startswith("/auth/"):
        return AUTH_FALLBACK_LIMIT
    return default_limit


def is_sensitive_rate_limit_path(path: str) -> bool:
    return path.startswith("/auth/") or path in SENSITIVE_EXACT_PATHS


class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, limit: int = 100, window: int = 60):
        super().__init__(app)
        self.limit = limit
        self.window = window
        self.redis = redis.from_url(settings.REDIS_URL, decode_responses=True)
        self.local_store = InMemoryRateLimitStore(window)
        self.trusted_proxy_networks = parse_trusted_proxy_cidrs(settings.TRUSTED_PROXY_CIDRS)

    async def dispatch(self, request: Request, call_next):
        # Bypass for certain paths if needed
        if request.url.path in RATE_LIMIT_EXEMPT_PATHS:
            return await call_next(request)

        # Get client IP
        client_ip = client_ip_from_request(request, self.trusted_proxy_networks)
        
        # Use stricter limit for auth endpoints
        path_limit = rate_limit_for_path(request.url.path, self.limit)
        
        key = f"rate_limit:{client_ip}:{request.url.path}"
        count = 0
        
        try:
            # 1. Redis Check (Pre-processing)
            pipe = self.redis.pipeline()
            await pipe.incr(key)
            await pipe.expire(key, self.window, nx=True)
            results = await pipe.execute()
            
            count = results[0]
            
            if count > path_limit:
                logger.warning(f"Rate limit exceeded for {client_ip} on {request.url.path} ({count}/{path_limit})")
                return _too_many_requests()
        except Exception as e:
            logger.error(f"Rate Limiter Redis Error: {e}")
            if is_sensitive_rate_limit_path(request.url.path):
                count = await self.local_store.increment(key)
                if count > path_limit:
                    logger.warning(
                        "Local rate limit exceeded for %s on %s (%s/%s)",
                        client_ip,
                        request.url.path,
                        count,
                        path_limit,
                    )
                    return _too_many_requests()

        # 3. Request Processing (Post-processing)
        response = await call_next(request)
        
        # Add headers if we have information
        if count > 0:
            response.headers["X-RateLimit-Limit"] = str(path_limit)
            response.headers["X-RateLimit-Remaining"] = str(max(0, path_limit - count))
            
        return response


def _too_many_requests():
    return JSONResponse(
        status_code=429,
        content={"detail": "Too many requests. Please try again later."},
    )
