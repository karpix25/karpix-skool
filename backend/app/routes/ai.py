import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel.ext.asyncio.session import AsyncSession

from ..config import settings
from ..db import get_session
from ..models import Tenant
from ..services.subscriptions import reserve_ai_job
from ..utils.tenant import get_active_tenant_id
from ..utils.logging_config import logger

router = APIRouter(tags=["AI"])

class AIRequest(BaseModel):
    prompt: str
    system_instruction: Optional[str] = None

@router.post("/generate-suggestion")
async def generate_suggestion(
    req: AIRequest,
    tenant_id: uuid.UUID = Depends(get_active_tenant_id),
    session: AsyncSession = Depends(get_session),
):
    logger.debug("AI suggestion request accepted for tenant %s", tenant_id)
    tenant = await session.get(Tenant, tenant_id)
    if not tenant or tenant.deleted_at:
        raise HTTPException(status_code=404, detail="Tenant not found")
    if not settings.GOOGLE_API_KEY:
        logger.error("GOOGLE_API_KEY not configured in backend settings")
        raise HTTPException(status_code=500, detail="AI service not configured")

    await reserve_ai_job(session, tenant)
    
    try:
        from google import generativeai as genai

        genai.configure(api_key=settings.GOOGLE_API_KEY)
        model = genai.GenerativeModel("gemini-1.5-flash")
        
        # We can add safety settings or specific formatting here
        full_prompt = req.prompt
        if req.system_instruction:
            full_prompt = f"{req.system_instruction}\n\nUser Request: {req.prompt}"
            
        response = await model.generate_content_async(full_prompt)
        return {"text": response.text}
    except Exception as e:
        logger.error(f"AI Generation Error: {e}")
        raise HTTPException(status_code=500, detail=f"AI Error: {str(e)}")
