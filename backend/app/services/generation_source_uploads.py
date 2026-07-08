from fastapi import HTTPException, Request, UploadFile

from ..schemas.generation_sources import (
    GenerationSourceInput,
    GenerationSourceKind,
    GenerationSourceUploadRead,
)
from .generation_upload_validation import read_validated_generation_source_upload
from .upload_urls import build_uploaded_file_url
from ..utils.r2 import storage


async def upload_generation_source_file(
    *,
    request: Request,
    file: UploadFile,
    folder: str,
) -> GenerationSourceUploadRead:
    try:
        validated = await read_validated_generation_source_upload(file)
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
                url=build_uploaded_file_url(request, key),
                content_type=validated.content_type,
                size_bytes=validated.size_bytes,
            )
        )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Source file upload failed") from exc
