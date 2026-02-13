from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from ..routes.auth import get_current_user
from ..models import User
from ..config import settings
import google.generativeai as genai
from ..utils.logging_config import logger

router = APIRouter(tags=["AI"])

class AIRequest(BaseModel):
    prompt: str
    system_instruction: Optional[str] = None

@router.post("/generate-suggestion")
async def generate_suggestion(
    req: AIRequest,
    current_user: User = Depends(get_current_user)
):
    if not settings.GOOGLE_API_KEY:
        logger.error("GOOGLE_API_KEY not configured in backend settings")
        raise HTTPException(status_code=500, detail="AI service not configured")
    
    try:
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
