import asyncio
import sys
import os

# Add parent directory to path to import app modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from app.config import settings

async def add_columns():
    print(f"Connecting to {settings.DATABASE_URL.split('@')[1]}...")
    engine = create_async_engine(settings.DATABASE_URL)
    
    commands = [
        "ALTER TABLE tenant ADD COLUMN IF NOT EXISTS telegram_topic_id BIGINT",
        "ALTER TABLE tenant ADD COLUMN IF NOT EXISTS telegram_topic_id_vip BIGINT",
        "ALTER TABLE \"user\" ADD COLUMN IF NOT EXISTS is_onboarded BOOLEAN DEFAULT FALSE",
        "ALTER TABLE tenantmember ADD COLUMN IF NOT EXISTS is_onboarded BOOLEAN DEFAULT FALSE"
    ]
    
    async with engine.begin() as conn:
        for cmd in commands:
            print(f"Executing: {cmd}")
            try:
                await conn.execute(text(cmd))
                print("Success.")
            except Exception as e:
                print(f"Error: {e}")
                
    await engine.dispose()
    print("Done.")

if __name__ == "__main__":
    asyncio.run(add_columns())
