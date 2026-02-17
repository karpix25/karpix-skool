
import asyncio
from sqlalchemy import text
from app.db import engine

async def migrate():
    async with engine.begin() as conn:
        print("Checking/Adding telegram_topic_id...")
        try:
            await conn.execute(text("ALTER TABLE tenant ADD COLUMN telegram_topic_id BIGINT"))
            print("  Added telegram_topic_id")
        except Exception as e:
            if "already exists" in str(e):
                print("  telegram_topic_id already exists")
            else:
                print(f"  Error adding telegram_topic_id: {e}")
            
        print("Checking/Adding telegram_topic_id_vip...")
        try:
            await conn.execute(text("ALTER TABLE tenant ADD COLUMN telegram_topic_id_vip BIGINT"))
            print("  Added telegram_topic_id_vip")
        except Exception as e:
            if "already exists" in str(e):
                print("  telegram_topic_id_vip already exists")
            else:
                print(f"  Error adding telegram_topic_id_vip: {e}")
        
    print("Migration finished.")

if __name__ == "__main__":
    asyncio.run(migrate())
