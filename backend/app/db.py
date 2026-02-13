from sqlmodel import SQLModel, create_engine
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy.orm import sessionmaker
from .config import settings

# Async Engine for APP
engine = create_async_engine(settings.DATABASE_URL, echo=True, future=True)

from sqlalchemy import text

async def init_db():
    try:
        async with engine.begin() as conn:
            # 1. Create tables if they don't exist
            try:
                await conn.run_sync(SQLModel.metadata.create_all)
                print("DB INIT: create_all success")
            except Exception as e:
                print(f"DB INIT ERROR (create_all): {e}")
            
            # 2. Simple Migration: Add missing columns if they don't exist
            migrations = [
                "ALTER TABLE tenantmember ADD COLUMN IF NOT EXISTS joined_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()",
                "ALTER TABLE tenantmember ADD COLUMN IF NOT EXISTS status VARCHAR DEFAULT 'active'",
                "ALTER TABLE tenantmember ADD COLUMN IF NOT EXISTS paused_at TIMESTAMP WITHOUT TIME ZONE",
                "ALTER TABLE tenantmember ADD COLUMN IF NOT EXISTS xp INTEGER DEFAULT 0",
                "ALTER TABLE tenantmember ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 1",
                "ALTER TABLE tenantmember ADD COLUMN IF NOT EXISTS cohort_start_date TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()",
                "ALTER TABLE lesson ADD COLUMN IF NOT EXISTS video_provider VARCHAR",
                "ALTER TABLE lesson ADD COLUMN IF NOT EXISTS video_id VARCHAR",
                "ALTER TABLE lesson ADD COLUMN IF NOT EXISTS content TEXT",
                "ALTER TABLE lesson ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0",
                "ALTER TABLE lesson ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT FALSE",
                "ALTER TABLE module ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0",
                "ALTER TABLE course ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT FALSE",
                'ALTER TABLE "user" ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN DEFAULT FALSE',
                'ALTER TABLE "tenant" ADD COLUMN IF NOT EXISTS telegram_group_id BIGINT',
                'ALTER TABLE "tenant" ADD COLUMN IF NOT EXISTS setup_code VARCHAR',
                'ALTER TABLE "tenant" ADD COLUMN IF NOT EXISTS bot_token_override VARCHAR',
                "ALTER TABLE course ADD COLUMN IF NOT EXISTS unlock_type VARCHAR DEFAULT 'open'",
                "ALTER TABLE course ADD COLUMN IF NOT EXISTS unlock_value VARCHAR",
                "ALTER TABLE course ADD COLUMN IF NOT EXISTS is_vip BOOLEAN DEFAULT FALSE",
                "ALTER TABLE module ADD COLUMN IF NOT EXISTS unlock_type VARCHAR DEFAULT 'immediate'",
                "ALTER TABLE module ADD COLUMN IF NOT EXISTS unlock_value VARCHAR",
                "ALTER TABLE module ADD COLUMN IF NOT EXISTS is_vip BOOLEAN DEFAULT FALSE",
                "ALTER TABLE lesson ADD COLUMN IF NOT EXISTS is_vip BOOLEAN DEFAULT FALSE",
                "ALTER TABLE lesson ADD COLUMN IF NOT EXISTS unlock_type VARCHAR DEFAULT 'immediate'",
                "ALTER TABLE lesson ADD COLUMN IF NOT EXISTS unlock_value VARCHAR",
                "ALTER TABLE \"user\" ADD COLUMN IF NOT EXISTS admin_status VARCHAR DEFAULT 'none'",
                "ALTER TABLE \"user\" ADD COLUMN IF NOT EXISTS admin_request_details TEXT",
                "ALTER TABLE \"user\" ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT FALSE",
                "ALTER TABLE \"tenant\" ADD COLUMN IF NOT EXISTS telegram_group_id_vip BIGINT",
                "ALTER TABLE \"tenant\" ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITHOUT TIME ZONE",
                "ALTER TABLE module ALTER COLUMN unlock_type DROP NOT NULL",
                "ALTER TABLE module ALTER COLUMN unlock_type SET DEFAULT 'immediate'",
                "UPDATE module SET unlock_type = 'immediate' WHERE unlock_type IS NULL",
            ]
            
            for m in migrations:
                try:
                    await conn.execute(text(m))
                    print(f"MIGRATION SUCCESS: {m}")
                except Exception as e:
                    print(f"MIGRATION LOG: {m} | Info: {e}")
    except Exception as e:
        print(f"CRITICAL DB INIT FAILURE: {e}")

async def get_session() -> AsyncSession:
    async_session = sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False
    )
    async with async_session() as session:
        yield session
