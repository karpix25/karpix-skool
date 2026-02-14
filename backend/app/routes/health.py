from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from app.db import get_session
from sqlmodel.ext.asyncio.session import AsyncSession
import redis.asyncio as redis
from ..config import settings

router = APIRouter()

@router.get("/health")
async def combined_health(session: AsyncSession = Depends(get_session)):
    """
    Consolidated health check for external monitoring (Easypanel).
    """
    db_ok = False
    redis_ok = False
    
    # 1. DB Check
    try:
        await session.execute(text("SELECT 1"))
        db_ok = True
    except:
        db_ok = False
        
    # 2. Redis Check
    try:
        r = redis.from_url(settings.REDIS_URL)
        await r.ping()
        redis_ok = True
    except:
        redis_ok = False
        
    if not (db_ok and redis_ok):
        raise HTTPException(
            status_code=503,
            detail={"db": db_ok, "redis": redis_ok}
        )
        
    return {"status": "ok", "db": db_ok, "redis": redis_ok}

@router.get("/health/db")
async def health_check_db(session: AsyncSession = Depends(get_session)):
    # ... existing db health check logic ...
    try:
        await session.execute(text("SELECT 1"))
        res = await session.execute(text("SELECT version_num FROM alembic_version"))
        version = res.scalar()
        return {"status": "healthy", "database": "connected", "migration_version": version}
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Database unhealthy: {str(e)}")
