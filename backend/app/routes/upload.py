import uuid

from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile, File
from fastapi.responses import Response
from .auth import get_current_user
from ..db import get_session
from ..models import Tenant, User
from ..services.subscriptions import release_storage_bytes, reserve_storage_bytes
from ..services.upload_urls import (
    GENERATION_SOURCE_PREFIX,
    build_uploaded_file_url,
    validate_generation_source_access,
    validate_upload_key,
)
from ..services.upload_validation import read_validated_image_upload
from ..utils.tenant import get_active_tenant_id
from ..utils.r2 import storage
from botocore.exceptions import ClientError
from sqlmodel.ext.asyncio.session import AsyncSession

router = APIRouter()


@router.post("/upload")
async def upload_file(
    request: Request,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    tenant_id: uuid.UUID = Depends(get_active_tenant_id),
    session: AsyncSession = Depends(get_session),
):
    tenant = await session.get(Tenant, tenant_id)
    if not tenant or tenant.deleted_at:
        raise HTTPException(status_code=404, detail="Tenant not found")
    reserved_bytes = 0
    try:
        validated = await read_validated_image_upload(file)
        await reserve_storage_bytes(session, tenant, validated.size_bytes)
        reserved_bytes = validated.size_bytes
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
        if reserved_bytes:
            await release_storage_bytes(session, tenant.id, reserved_bytes)
        from ..utils.logging_config import logger
        logger.error(f"Upload error: {e}")
        raise HTTPException(status_code=500, detail="Upload failed")


@router.get("/files/{key:path}", name="get_uploaded_file")
async def get_uploaded_file(
    key: str,
    tenant_id: uuid.UUID | None = None,
    expires: int | None = None,
    signature: str | None = None,
):
    validate_upload_key(key)
    if key.startswith(GENERATION_SOURCE_PREFIX):
        validate_generation_source_access(
            key,
            tenant_id=tenant_id,
            expires=expires,
            signature=signature,
        )
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
