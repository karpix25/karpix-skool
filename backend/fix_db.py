import asyncio
import logging
from sqlalchemy import text
from app.db import engine

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("DB_FIX")

async def fix_db():
    migrations = [
        "ALTER TABLE tenantmember ADD COLUMN IF NOT EXISTS status VARCHAR DEFAULT 'active'",
        "ALTER TABLE tenantmember ADD COLUMN IF NOT EXISTS paused_at TIMESTAMP WITHOUT TIME ZONE",
        "ALTER TABLE tenantmember ADD COLUMN IF NOT EXISTS xp INTEGER DEFAULT 0",
        "ALTER TABLE tenantmember ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 1",
        "ALTER TABLE tenantmember ADD COLUMN IF NOT EXISTS cohort_start_date TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()",
        'ALTER TABLE "user" ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN DEFAULT FALSE',
        'ALTER TABLE "tenant" ADD COLUMN IF NOT EXISTS telegram_group_id BIGINT',
        'ALTER TABLE "tenant" ADD COLUMN IF NOT EXISTS setup_code VARCHAR',
        'ALTER TABLE "tenant" ADD COLUMN IF NOT EXISTS bot_token_override VARCHAR',
        "ALTER TABLE course ADD COLUMN IF NOT EXISTS unlock_type VARCHAR DEFAULT 'open'",
        "ALTER TABLE course ADD COLUMN IF NOT EXISTS unlock_value VARCHAR",
        "ALTER TABLE module ADD COLUMN IF NOT EXISTS unlock_type VARCHAR DEFAULT 'immediate'",
        "ALTER TABLE module ADD COLUMN IF NOT EXISTS unlock_value VARCHAR",
        "ALTER TABLE \"user\" ADD COLUMN IF NOT EXISTS admin_status VARCHAR DEFAULT 'none'",
        "ALTER TABLE \"user\" ADD COLUMN IF NOT EXISTS admin_request_details TEXT",
        "ALTER TABLE \"user\" ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT FALSE",
        "ALTER TABLE \"tenant\" ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITHOUT TIME ZONE",
    ]
    
    logger.info("Starting database schema fix...")
    async with engine.begin() as conn:
        for m in migrations:
            try:
                await conn.execute(text(m))
                logger.info(f"SUCCESS: {m}")
            except Exception as e:
                logger.error(f"FAILED: {m} | Error: {e}")
    
    logger.info("Database schema fix completed.")

if __name__ == "__main__":
    asyncio.run(fix_db())
