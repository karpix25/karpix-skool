from sqlmodel import SQLModel, create_engine
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy.orm import sessionmaker
from .config import settings

# Async Engine for APP
engine = create_async_engine(settings.DATABASE_URL, echo=True, future=True)

from sqlalchemy import text

async def init_db():
    async with engine.begin() as conn:
        # 1. Create tables if they don't exist
        await conn.run_sync(SQLModel.metadata.create_all)
        
        # 2. Simple Migration: Add missing columns if they don't exist
        # This is a safe way to update schema without Alembic for now
        migrations = [
            'ALTER TABLE "user" ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN DEFAULT FALSE',
            'ALTER TABLE "tenant" ADD COLUMN IF NOT EXISTS telegram_group_id BIGINT',
            'ALTER TABLE "tenant" ADD COLUMN IF NOT EXISTS setup_code VARCHAR',
            'ALTER TABLE "tenant" ADD COLUMN IF NOT EXISTS bot_token_override VARCHAR',
            "ALTER TABLE tenantmember ADD COLUMN IF NOT EXISTS status VARCHAR DEFAULT 'active'",
            "ALTER TABLE tenantmember ADD COLUMN IF NOT EXISTS paused_at TIMESTAMP WITHOUT TIME ZONE",
            "ALTER TABLE tenantmember ADD COLUMN IF NOT EXISTS xp INTEGER DEFAULT 0",
            "ALTER TABLE tenantmember ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 1",
            "ALTER TABLE tenantmember ADD COLUMN IF NOT EXISTS cohort_start_date TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()",
            "ALTER TABLE course ADD COLUMN IF NOT EXISTS unlock_type VARCHAR DEFAULT 'open'",
            "ALTER TABLE course ADD COLUMN IF NOT EXISTS unlock_value VARCHAR",
            "ALTER TABLE module ADD COLUMN IF NOT EXISTS unlock_type VARCHAR DEFAULT 'immediate'",
            "ALTER TABLE module ADD COLUMN IF NOT EXISTS unlock_value VARCHAR",
        ]
        
        for m in migrations:
            try:
                await conn.execute(text(m))
            except Exception as e:
                print(f"MIGRATION ERROR: {e}")

async def get_session() -> AsyncSession:
    async_session = sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False
    )
    async with async_session() as session:
        yield session
