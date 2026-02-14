import asyncio
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession
from app.db import engine
from app.models import Lesson

async def main():
    async with AsyncSession(engine) as session:
        stmt = select(Lesson).order_by(Lesson.created_at.desc())
        res = await session.exec(stmt)
        lessons = res.all()
        print(f"Total lessons: {len(lessons)}")
        for l in lessons[:10]:
            content_len = len(l.content) if l.content else 0
            print(f"ID: {l.id} | Title: {l.title} | Content length: {content_len} | Content start: {l.content[:30] if l.content else 'None'}")

if __name__ == '__main__':
    asyncio.run(main())
