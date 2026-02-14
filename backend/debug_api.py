import asyncio
import sys
import os
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

sys.path.append(os.getcwd())

from app.db import engine
from app.models import Lesson

async def main():
    async with AsyncSession(engine) as session:
        res = await session.exec(select(Lesson).order_by(Lesson.created_at.desc()))
        lesson = res.first()
        if lesson:
            print(f"DATABASE: ID={lesson.id}, Title={lesson.title}, Content='{lesson.content[:20] if lesson.content else 'NONE'}'")
            print(f"DICT: {lesson.dict()}")
        else:
            print("No lessons found")

if __name__ == '__main__':
    asyncio.run(main())
