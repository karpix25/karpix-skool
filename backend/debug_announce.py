
import asyncio
import uuid
from sqlmodel import select
from app.db import async_session_maker
from app.models import Tenant, Course

async def check():
    async with async_session_maker() as session:
        tenant_id = uuid.UUID("777e9580-cb40-4934-b60b-417b27fae2cc")
        course_id = uuid.UUID("df0751ee-d0dc-447b-93fb-052d44d6e0ce")
        
        tenant = await session.get(Tenant, tenant_id)
        course = await session.get(Course, course_id)
        
        print(f"Tenant: {tenant.name if tenant else 'Not found'}")
        if tenant:
            print(f"  Regular Group ID: {tenant.telegram_group_id}")
            print(f"  VIP Group ID: {tenant.telegram_group_id_vip}")
            print(f"  Setup Code: {tenant.setup_code}")
            
        print(f"Course: {course.title if course else 'Not found'}")
        if course:
            print(f"  Is VIP: {course.is_vip}")

if __name__ == "__main__":
    asyncio.run(check())
