from sqlmodel import SQLModel, create_engine
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text
from alembic.config import Config
from alembic import command
import os
from .config import settings

# Async Engine with Statement Timeout (Phase 2 optimization)
# 30000ms = 30s
engine = create_async_engine(
    settings.DATABASE_URL, 
    echo=False, 
    future=True,
    pool_size=10,          # Optimized for multi-worker setup (4 workers * 10 = 40 total)
    max_overflow=5,       # Burst allowance
    pool_timeout=30,
    pool_recycle=3600,
    connect_args={
        "server_settings": {"statement_timeout": "30000"},
        "command_timeout": 30
    } 
)

async def init_db():
    """
    Automated Migration Runner with Advisory Locking.
    Ensures safe, production-grade schema updates.
    """
    try:
        async with engine.begin() as conn:
            from .utils.logging_config import db_logger as logger
            # 1. Acquire Migration Lock (Postgres Advisory Lock)
            # 8273 is an arbitrary lock ID for migrations
            logger.info("DB INIT: Acquiring migration lock...")
            await conn.execute(text("SELECT pg_advisory_xact_lock(8273)"))
            
            # 2. Run Alembic Upgrade
            # Since Alembic is a sync tool, we need to handle its configuration
            # In a containerized environment, the alembic.ini is in the root
            logger.info("DB INIT: Running Alembic migrations (upgrade head)...")
            
            def run_upgrade(connection):
                alembic_cfg = Config("alembic.ini")
                alembic_cfg.attributes["connection"] = connection
                command.upgrade(alembic_cfg, "head")

            await conn.run_sync(run_upgrade)
            logger.info("DB INIT: Alembic upgrade successful")
            
    except Exception as e:
        from .utils.logging_config import db_logger as logger
        logger.critical(f"CRITICAL DB INIT FAILURE: {e}")
        # In production, we might want to crash here to prevent starting with broken schema
        raise e

async def get_session() -> AsyncSession:
    async_session = sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False
    )
    async with async_session() as session:
        yield session
