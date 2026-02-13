from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from .auth import get_current_user
from ..models import User
from ..utils.r2 import storage
import uuid

router = APIRouter()

@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Only image files are allowed")

    try:
        content = await file.read()
        url = await storage.upload_file(
            file_content=content,
            filename=file.filename,
            content_type=file.content_type,
            folder="oblozhki"
        )
        return {"url": url}
    except Exception as e:
        from ..utils.logging_config import logger
        logger.error(f"Upload error: {e}")
        raise HTTPException(status_code=500, detail="Upload failed")
