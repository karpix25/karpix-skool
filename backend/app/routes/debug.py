
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlmodel.ext.asyncio.session import AsyncSession
from app.db import get_session
import uuid

router = APIRouter()

@router.get("/debug/tenant/{tenant_id}")
async def debug_tenant(tenant_id: uuid.UUID, session: AsyncSession = Depends(get_session)):
    result = await session.execute(text(f"SELECT id, name, telegram_group_id, telegram_topic_id, telegram_group_id_vip, telegram_topic_id_vip FROM tenant WHERE id = '{tenant_id}'"))
    row = result.fetchone()
    if not row:
        return {"error": "Tenant not found"}
        
    return {
        "id": str(row[0]),
        "name": row[1],
        "telegram_group_id": row[2],
        "telegram_topic_id": row[3],
        "telegram_group_id_vip": row[4],
        "telegram_topic_id_vip": row[5]
    }
