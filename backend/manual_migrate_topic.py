
import asyncio
from sqlalchemy import text
from app.db import engine

async def migrate():
    async with engine.begin() as conn:
        print("Adding telegram_topic_id...")
        try:
            await conn.execute(text("ALTER TABLE tenant ADD COLUMN telegram_topic_id BIGINT"))
        except Exception as e:
            print(f"Error adding telegram_topic_id: {e}")
            
        print("Adding telegram_topic_id_vip...")
        try:
            await conn.execute(text("ALTER TABLE tenant ADD COLUMN telegram_topic_id_vip BIGINT"))
        except Exception as e:
            print(f"Error adding telegram_topic_id_vip: {e}")
        
    print("Migration finished.")

if __name__ == "__main__":
    asyncio.run(migrate())
