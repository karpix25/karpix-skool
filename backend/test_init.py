import asyncio
import os

os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://test:test@localhost/test")
os.environ.setdefault("SECRET_KEY", "test-secret")

from app.db import init_db

async def main():
    print("Testing init_db()...")
    await init_db()
    print("Test complete.")

if __name__ == "__main__":
    asyncio.run(main())
