from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from app.db import get_session
from sqlmodel.ext.asyncio.session import AsyncSession

router = APIRouter()

@router.get("/health/db")
async def health_check_db(session: AsyncSession = Depends(get_session)):
    """
    Verifies database connectivity and essential schema state.
    """
    try:
        # 1. Check Connectivity
        await session.execute(text("SELECT 1"))
        
        # 2. Check Migration Status (Optional but good)
        # Verify if we can read the alembic version
        res = await session.execute(text("SELECT version_num FROM alembic_version"))
        version = res.scalar()
        
        return {
            "status": "healthy",
            "database": "connected",
            "migration_version": version
        }
    except Exception as e:
        raise HTTPException(
            status_code=503,
            detail=f"Database unhealthy: {str(e)}"
        )
