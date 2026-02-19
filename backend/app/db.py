from sqlmodel import SQLModel, create_engine
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text
from alembic.config import Config
from alembic import command
import os
from .config import settings

# Async Engine with Proactive Connection Management
engine = create_async_engine(
    settings.DATABASE_URL, 
    echo=False, 
    future=True,
    pool_size=15,          # Adjusted for 9 workers (9*15=135)
    max_overflow=5,         # 9*(15+5)=180 < 200 max_connections
    pool_timeout=30,
    pool_recycle=1800,      # Proactive recycle (30 min)
    pool_pre_ping=True,     # CRITICAL: Automatically reconnect if connection is closed
    connect_args={
        "server_settings": {"statement_timeout": "30000"},
        "command_timeout": 30
    } 
)

# Global Session Maker
async_session_maker = async_sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False
)

async def init_db():
    """
    Automated Migration Runner with Advisory Locking.
    """
    try:
        async with engine.begin() as conn:
            from .utils.logging_config import db_logger as logger
            logger.info("DB INIT: Acquiring migration lock...")
            await conn.execute(text("SELECT pg_advisory_xact_lock(8273)"))
            
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
        raise e

async def get_session() -> AsyncSession:
    async with async_session_maker() as session:
        yield session
