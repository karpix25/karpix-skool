from fastapi import HTTPException, Request, UploadFile
from sqlmodel.ext.asyncio.session import AsyncSession

from ..models import Tenant
from ..schemas.generation_sources import (
    GenerationSourceInput,
    GenerationSourceKind,
    GenerationSourceUploadRead,
)
from .generation_upload_validation import read_validated_generation_source_upload
from .upload_urls import build_generation_source_url
from .subscriptions import release_storage_bytes, reserve_storage_bytes
from ..utils.r2 import storage


async def upload_generation_source_file(
    *,
    request: Request,
    file: UploadFile,
    folder: str,
    session: AsyncSession,
    tenant: Tenant,
) -> GenerationSourceUploadRead:
    reserved_bytes = 0
    try:
        validated = await read_validated_generation_source_upload(file)
        await reserve_storage_bytes(session, tenant, validated.size_bytes)
        reserved_bytes = validated.size_bytes
        key = storage.build_key(filename=validated.filename, folder=folder)
        await storage.put_file(
            file_content=validated.content,
            key=key,
            content_type=validated.content_type,
        )
        return GenerationSourceUploadRead(
            source=GenerationSourceInput(
                kind=GenerationSourceKind.file,
                title=validated.filename,
                url=build_generation_source_url(request, key, tenant.id),
                content_type=validated.content_type,
                size_bytes=validated.size_bytes,
            )
        )
    except HTTPException:
        raise
    except Exception as exc:
        if reserved_bytes:
            await release_storage_bytes(session, tenant.id, reserved_bytes)
        raise HTTPException(status_code=500, detail="Source file upload failed") from exc
