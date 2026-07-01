import json
import functools
import hashlib
import uuid
import redis.asyncio as redis
from typing import Optional, Any
from fastapi import Request
from ..config import settings
from ..utils.logging_config import logger

# Global Redis connection pool
redis_pool = redis.ConnectionPool.from_url(
    settings.REDIS_URL, 
    decode_responses=True,
    max_connections=20 # Scaling: ensure enough connections for 9 workers
)
cache_redis = redis.Redis(connection_pool=redis_pool)

def cache_route(ttl: int = 300, key_prefix: str = "cache"):
    """
    Decorator to cache FastAPI route responses in Redis.
    ttl: Time to live in seconds (default 5 minutes)
    key_prefix: Prefix for the Redis key
    """
    def decorator(func):
        @functools.wraps(func)
        async def wrapper(*args, **kwargs):
            if not settings.ENABLE_CACHE:
                return await func(*args, **kwargs)

            # Find 'request' in kwargs or args to build a unique key
            request: Optional[Request] = kwargs.get("request")
            if not request:
                for arg in args:
                    if isinstance(arg, Request):
                        request = arg
                        break
            
            if not request:
                # If no request object found, we can't easily cache by URL
                return await func(*args, **kwargs)

            # Bypass cache if specified in query params
            if not settings.ENABLE_CACHE or request.query_params.get("nocache") == "1":
                return await func(*args, **kwargs)


            # Generate unique key based on URL and authenticated User ID (if any)
            user_id = "anon"
            current_user = kwargs.get("current_user")
            if current_user and hasattr(current_user, "id"):
                user_id = str(current_user.id)
            
            # Combine User context + Query Params for the hash
            hash_data = f"{user_id}:{str(request.query_params)}"
            key_hash = hashlib.sha256(hash_data.encode()).hexdigest()[:16]
            
            # Use path as prefix for easier invalidation
            cache_key = f"{key_prefix}:{request.url.path}:{key_hash}"

            try:
                cached_data = await cache_redis.get(cache_key)
                if cached_data:
                    logger.debug(f"CACHE HIT: {cache_key}")
                    return json.loads(cached_data)
            except Exception as e:
                logger.error(f"CACHE ERROR (FETCH): {e}")

            # Execute the actual function
            result = await func(*args, **kwargs)

            # Store in cache
            try:
                await cache_redis.setex(
                    cache_key,
                    ttl,
                    json.dumps(result, default=str) # Handle UUIDs and datetimes
                )
                logger.debug(f"CACHE MISS-SET: {cache_key}")
            except Exception as e:
                logger.error(f"CACHE ERROR (SET): {e}")

            return result
        return wrapper
    return decorator

async def clear_cache(key_prefix: str = "cache:*"):
    """
    Clear cache keys matching a pattern.
    """
    try:
        cursor = 0
        deleted_count = 0
        while True:
            cursor, keys = await cache_redis.scan(
                cursor=cursor,
                match=key_prefix,
                count=500,
            )
            if keys:
                deleted_count += await cache_redis.delete(*keys)

            if cursor == 0:
                break

        if deleted_count:
            logger.info(f"CACHE CLEARED: {deleted_count} keys")
    except Exception as e:
        logger.error(f"CACHE CLEAR ERROR: {e}")
