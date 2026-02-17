
import asyncio
import uuid
from app.db import async_session_maker
from app.models import Tenant
from sqlalchemy.future import select

async def check_tenant_topic():
    async with async_session_maker() as session:
        # Tenant ID from previous logs: 777e9580-cb40-4934-b60b-417b27fae2cc
        tenant_id = uuid.UUID("777e9580-cb40-4934-b60b-417b27fae2cc")
        stmt = select(Tenant).where(Tenant.id == tenant_id)
        result = await session.execute(stmt)
        tenant = result.scalars().first()
        
        if tenant:
            print(f"Tenant: {tenant.name}")
            print(f"  Regular Group: {tenant.telegram_group_id}")
            print(f"  Regular Topic: {tenant.telegram_topic_id}")
            print(f"  VIP Group:     {tenant.telegram_group_id_vip}")
            print(f"  VIP Topic:     {tenant.telegram_topic_id_vip}")
        else:
            print("Tenant not found")

if __name__ == "__main__":
    asyncio.run(check_tenant_topic())
