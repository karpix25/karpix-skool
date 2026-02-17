
import asyncio
import uuid
from sqlmodel import select
from app.db import async_session_maker
from app.models import Course

async def check():
    async with async_session_maker() as session:
        course_id = uuid.UUID("df0751ee-d0dc-447b-93fb-052d44d6e0ce")
        course = await session.get(Course, course_id)
        if course:
            print(f"Course: {course.title}")
            print(f"  Is VIP: {course.is_vip}")
        else:
            print("Course not found")

if __name__ == "__main__":
    asyncio.run(check())
