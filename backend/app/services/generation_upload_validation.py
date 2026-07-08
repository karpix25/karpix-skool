from dataclasses import dataclass

from fastapi import HTTPException, UploadFile


MAX_GENERATION_SOURCE_BYTES = 80 * 1024 * 1024
UPLOAD_READ_CHUNK_BYTES = 64 * 1024


@dataclass(frozen=True)
class ValidatedGenerationSourceUpload:
    content: bytes
    content_type: str
    filename: str
    size_bytes: int


GENERATION_SOURCE_TYPES = {
    "application/pdf": "pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
    "audio/mpeg": "mp3",
    "audio/mp4": "m4a",
    "audio/wav": "wav",
    "video/mp4": "mp4",
    "text/csv": "csv",
    "text/markdown": "md",
    "text/plain": "txt",
}

GENERATION_SOURCE_TYPE_ALIASES = {
    "application/x-pdf": "application/pdf",
    "text/x-markdown": "text/markdown",
    "application/markdown": "text/markdown",
    "application/octet-stream": "",
}


async def read_validated_generation_source_upload(
    file: UploadFile,
    *,
    max_bytes: int = MAX_GENERATION_SOURCE_BYTES,
) -> ValidatedGenerationSourceUpload:
    content = await _read_limited(file, max_bytes=max_bytes)
    if not content:
        raise HTTPException(status_code=400, detail="Uploaded source file is empty")

    content_type = _normalize_content_type(file.content_type, file.filename)
    if content_type not in GENERATION_SOURCE_TYPES:
        raise HTTPException(
            status_code=400,
            detail="Only PDF, DOCX, PPTX, TXT, Markdown, CSV, MP3, M4A, WAV, and MP4 files are allowed",
        )

    if content_type == "application/pdf" and not content.startswith(b"%PDF"):
        raise HTTPException(status_code=400, detail="Uploaded PDF does not match its content")

    filename = _normalized_filename(file.filename, GENERATION_SOURCE_TYPES[content_type])
    return ValidatedGenerationSourceUpload(
        content=content,
        content_type=content_type,
        filename=filename,
        size_bytes=len(content),
    )


async def _read_limited(file: UploadFile, *, max_bytes: int) -> bytes:
    content = bytearray()
    while len(content) <= max_bytes:
        read_size = min(UPLOAD_READ_CHUNK_BYTES, max_bytes + 1 - len(content))
        chunk = await file.read(read_size)
        if not chunk:
            return bytes(content)
        content.extend(chunk)

    raise HTTPException(status_code=413, detail="Uploaded source file is too large")


def _normalize_content_type(content_type: str | None, filename: str | None) -> str:
    raw_type = (content_type or "").split(";", 1)[0].lower()
    mapped_type = GENERATION_SOURCE_TYPE_ALIASES.get(raw_type, raw_type)
    if mapped_type:
        return mapped_type

    extension = (filename or "").rsplit(".", 1)[-1].lower()
    for allowed_type, allowed_extension in GENERATION_SOURCE_TYPES.items():
        if extension == allowed_extension:
            return allowed_type
    return raw_type


def _normalized_filename(filename: str | None, extension: str) -> str:
    raw_name = (filename or "source").replace("\\", "/").rsplit("/", 1)[-1]
    stem = raw_name.rsplit(".", 1)[0] or "source"
    safe_stem = "".join(char for char in stem if char.isalnum() or char in "._-")[:80]
    return f"{safe_stem or 'source'}.{extension}"
