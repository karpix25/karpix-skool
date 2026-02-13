import asyncio
from app.db import init_db

async def main():
    print("Testing init_db()...")
    await init_db()
    print("Test complete.")

if __name__ == "__main__":
    asyncio.run(main())
