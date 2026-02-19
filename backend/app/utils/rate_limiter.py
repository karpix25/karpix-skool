import time
from fastapi import Request, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware
import redis.asyncio as redis
from ..config import settings
from ..utils.logging_config import logger

# Stricter limits for sensitive endpoints (brute-force protection)
AUTH_RATE_LIMITS = {
    "/auth/login": 15,
    "/auth/register": 15,
    "/auth/login/telegram": 15,
    "/auth/dev-login": 5,
    "/webapp/login": 30,
}

class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, limit: int = 100, window: int = 60):
        super().__init__(app)
        self.limit = limit
        self.window = window
        self.redis = redis.from_url(settings.REDIS_URL, decode_responses=True)

    async def dispatch(self, request: Request, call_next):
        # Bypass for certain paths if needed
        if request.url.path in ["/", "/health"]:
            return await call_next(request)

        # Get client IP
        client_ip = request.client.host
        
        # Use stricter limit for auth endpoints
        path_limit = AUTH_RATE_LIMITS.get(request.url.path, self.limit)
        
        key = f"rate_limit:{client_ip}:{request.url.path}"

        allowed = True
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
                allowed = False
        except Exception as e:
            # If Redis is down, we allow the request but log the error
            logger.error(f"Rate Limiter Redis Error: {e}")
            # Fallback to allowed = True

        # 2. Decision Logic
        if not allowed:
            raise HTTPException(status_code=429, detail="Too many requests. Please try again later.")

        # 3. Request Processing (Post-processing)
        response = await call_next(request)
        
        # Add headers if we have information
        if count > 0:
            response.headers["X-RateLimit-Limit"] = str(path_limit)
            response.headers["X-RateLimit-Remaining"] = str(max(0, path_limit - count))
            
        return response

