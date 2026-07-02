import uuid

from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile, File
from fastapi.responses import Response
from .auth import get_current_user
from ..models import User
from ..services.upload_urls import build_uploaded_file_url, validate_upload_key
from ..services.upload_validation import read_validated_image_upload
from ..utils.tenant import get_active_tenant_id
from ..utils.r2 import storage
from botocore.exceptions import ClientError

router = APIRouter()


@router.post("/upload")
async def upload_file(
    request: Request,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    tenant_id: uuid.UUID = Depends(get_active_tenant_id),
):
    try:
        validated = await read_validated_image_upload(file)
        key = storage.build_key(
            filename=validated.filename,
            folder=f"oblozhki/{tenant_id}",
        )
        await storage.put_file(
            file_content=validated.content,
            key=key,
            content_type=validated.content_type,
        )
        return {"url": build_uploaded_file_url(request, key)}
    except HTTPException:
        raise
    except Exception as e:
        from ..utils.logging_config import logger
        logger.error(f"Upload error: {e}")
        raise HTTPException(status_code=500, detail="Upload failed")


@router.get("/files/{key:path}", name="get_uploaded_file")
async def get_uploaded_file(key: str):
    validate_upload_key(key)
    try:
        content, content_type = await storage.read_file(key)
    except ClientError as exc:
        error_code = exc.response.get("Error", {}).get("Code")
        if error_code in {"NoSuchKey", "404", "NotFound"}:
            raise HTTPException(status_code=404, detail="File not found") from exc
        raise

    return Response(
        content=content,
        media_type=content_type or "application/octet-stream",
        headers={"Cache-Control": "public, max-age=31536000, immutable"},
    )
