import time
from fastapi import Request, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware
import redis.asyncio as redis
from ..config import settings
from ..utils.logging_config import logger

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
            
            if count > self.limit:
                logger.warning(f"Rate limit exceeded for {client_ip} on {request.url.path}")
                allowed = False
        except Exception as e:
            # If Redis is down, we allow the request but log the error
            logger.error(f"Rate Limiter Redis Error: {e}")
            # Fallback to allowed = True

        # 2. Decision Logic
        if not allowed:
            raise HTTPException(status_code=429, detail="Too many requests. Please try again later.")

        # 3. Request Processing (Post-processing)
        # Note: We NO LONGER wrap this in a try-except here that calls call_next again.
        # Exceptions from inside the app should bubble up to other middlewares (like log_requests)
        response = await call_next(request)
        
        # Add headers if we have information
        if count > 0:
            response.headers["X-RateLimit-Limit"] = str(self.limit)
            response.headers["X-RateLimit-Remaining"] = str(max(0, self.limit - count))
            
        return response
