import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

async def run():
    engine = create_async_engine("postgresql+asyncpg://nadaraya@localhost:5432/app")
    async with engine.connect() as conn:
        res = await conn.execute(text("SELECT id, title, video_provider, mux_status, mux_playback_id FROM lesson"))
        rows = res.fetchall()
        print(f"Found {len(rows)} lessons:")
        for row in rows:
            print(f"ID: {row[0]}, Title: {row[1]}, Provider: {row[2]}, Status: {row[3]}, Playback: {row[4]}")
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(run())
