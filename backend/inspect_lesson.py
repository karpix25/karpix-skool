import asyncio
import os
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

async def run():
    # Use the same connection string logic as the app
    engine = create_async_engine("postgresql+asyncpg://nadaraya@localhost:5432/app")
    async with engine.connect() as conn:
        res = await conn.execute(
            text("SELECT content FROM lesson WHERE id = :id"),
            {"id": "be368f8c-40ed-41f8-b1ed-7355fd50b3ef"}
        )
        row = res.first()
        if row:
            print("--- LESSON CONTENT ---")
            print(row[0])
            print("--- END CONTENT ---")
        else:
            print("Lesson not found")
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(run())
