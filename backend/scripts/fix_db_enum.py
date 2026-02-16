import asyncio
from sqlalchemy import text
from app.db import engine

async def fix_enum():
    async with engine.begin() as conn:
        print("Adding 'owner' to memberrole enum...")
        try:
            # PostgreSQL doesn't support IF NOT EXISTS for ADD VALUE directly in some versions,
            # but we can check if it exists or just catch the exception.
            await conn.execute(text("ALTER TYPE memberrole ADD VALUE 'owner'"))
            print("Successfully added 'owner' to memberrole enum.")
        except Exception as e:
            if "already exists" in str(e):
                print("'owner' value already exists in memberrole enum.")
            else:
                print(f"Error adding 'owner' to enum: {e}")

if __name__ == "__main__":
    asyncio.run(fix_enum())
