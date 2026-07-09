from dataclasses import dataclass
from io import BytesIO
import re
import zipfile

from fastapi import HTTPException, UploadFile


MAX_LESSON_ATTACHMENT_BYTES = 80 * 1024 * 1024
UPLOAD_READ_CHUNK_BYTES = 64 * 1024


@dataclass(frozen=True)
class ValidatedLessonAttachmentUpload:
    content: bytes
    content_type: str
    filename: str
    size_bytes: int


LESSON_ATTACHMENT_TYPES = {
    "pdf": "application/pdf",
    "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "txt": "text/plain",
    "csv": "text/csv",
    "zip": "application/zip",
    "jpg": "image/jpeg",
    "jpeg": "image/jpeg",
    "png": "image/png",
    "webp": "image/webp",
}

CONTENT_TYPE_ALIASES = {
    "application/x-pdf": "application/pdf",
    "application/x-zip-compressed": "application/zip",
    "application/x-compressed": "application/zip",
    "multipart/x-zip": "application/zip",
    "application/csv": "text/csv",
    "application/octet-stream": "",
    "application/vnd.ms-excel": "text/csv",
    "text/comma-separated-values": "text/csv",
    "image/jpg": "image/jpeg",
    "image/pjpeg": "image/jpeg",
    "image/x-png": "image/png",
}

DANGEROUS_EXTENSIONS = {
    "app",
    "bat",
    "cmd",
    "com",
    "dmg",
    "exe",
    "htm",
    "html",
    "jar",
    "js",
    "jse",
    "msi",
    "php",
    "pkg",
    "pif",
    "pl",
    "ps1",
    "py",
    "rb",
    "scr",
    "sh",
    "svg",
    "vbe",
    "vbs",
    "wsf",
}

CANONICAL_EXTENSION_BY_TYPE = {
    "application/pdf": "pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
    "text/plain": "txt",
    "text/csv": "csv",
    "application/zip": "zip",
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
}


async def read_validated_lesson_attachment_upload(
    file: UploadFile,
    *,
    max_bytes: int = MAX_LESSON_ATTACHMENT_BYTES,
) -> ValidatedLessonAttachmentUpload:
    raw_filename = _safe_basename(file.filename)
    extension = _validated_extension(raw_filename)
    content = await _read_limited(file, max_bytes=max_bytes)
    if not content:
        raise HTTPException(status_code=400, detail="Uploaded attachment is empty")

    content_type = _normalized_content_type(file.content_type, extension)
    expected_type = LESSON_ATTACHMENT_TYPES[extension]
    if content_type != expected_type:
        raise HTTPException(status_code=400, detail="Attachment type does not match filename")

    _validate_content_signature(content=content, content_type=content_type)
    canonical_extension = CANONICAL_EXTENSION_BY_TYPE[content_type]
    filename = _normalized_filename(raw_filename, canonical_extension)

    return ValidatedLessonAttachmentUpload(
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

    raise HTTPException(status_code=413, detail="Uploaded attachment is too large")


def _safe_basename(filename: str | None) -> str:
    basename = (filename or "").replace("\\", "/").rsplit("/", 1)[-1].strip()
    if not basename or basename in {".", ".."}:
        raise HTTPException(status_code=400, detail="Attachment filename is required")
    return basename


def _validated_extension(filename: str) -> str:
    parts = [part.lower() for part in filename.split(".")]
    if len(parts) < 2 or not parts[-1]:
        raise HTTPException(status_code=400, detail="Attachment filename must include an extension")

    stem_parts = [part for part in parts[:-1] if part]
    if not stem_parts:
        raise HTTPException(status_code=400, detail="Attachment filename is invalid")
    if any(part in DANGEROUS_EXTENSIONS for part in stem_parts):
        raise HTTPException(status_code=400, detail="Attachment filename uses a dangerous extension")

    extension = parts[-1]
    if extension not in LESSON_ATTACHMENT_TYPES:
        raise HTTPException(
            status_code=400,
            detail="Only PDF, DOCX, XLSX, PPTX, TXT, CSV, ZIP, JPG, PNG, and WebP files are allowed",
        )
    return extension


def _normalized_content_type(content_type: str | None, extension: str) -> str:
    raw_type = (content_type or "").split(";", 1)[0].lower()
    mapped_type = CONTENT_TYPE_ALIASES.get(raw_type, raw_type)
    if mapped_type == "text/plain" and extension == "csv":
        return "text/csv"
    return mapped_type or LESSON_ATTACHMENT_TYPES[extension]


def _validate_content_signature(*, content: bytes, content_type: str) -> None:
    if content_type == "application/pdf" and not content.startswith(b"%PDF"):
        raise HTTPException(status_code=400, detail="Uploaded PDF does not match its content")
    if content_type == "image/jpeg" and not content.startswith(b"\xff\xd8\xff"):
        raise HTTPException(status_code=400, detail="Uploaded JPEG does not match its content")
    if content_type == "image/png" and not content.startswith(b"\x89PNG\r\n\x1a\n"):
        raise HTTPException(status_code=400, detail="Uploaded PNG does not match its content")
    if content_type == "image/webp" and not _is_webp(content):
        raise HTTPException(status_code=400, detail="Uploaded WebP does not match its content")
    if content_type in _zip_based_content_types():
        _validate_zip_content(content=content, content_type=content_type)
    if content_type in {"text/plain", "text/csv"} and b"\x00" in content:
        raise HTTPException(status_code=400, detail="Uploaded text file contains binary data")


def _is_webp(content: bytes) -> bool:
    return len(content) >= 12 and content[:4] == b"RIFF" and content[8:12] == b"WEBP"


def _zip_based_content_types() -> set[str]:
    return {
        "application/zip",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    }


def _validate_zip_content(*, content: bytes, content_type: str) -> None:
    try:
        with zipfile.ZipFile(BytesIO(content)) as archive:
            names = set(archive.namelist())
    except zipfile.BadZipFile as exc:
        raise HTTPException(status_code=400, detail="Uploaded ZIP-based file does not match its content") from exc

    if content_type == "application/zip":
        return

    expected_roots = {
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "word/",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xl/",
        "application/vnd.openxmlformats-officedocument.presentationml.presentation": "ppt/",
    }
    expected_root = expected_roots[content_type]
    if "[Content_Types].xml" not in names or not any(name.startswith(expected_root) for name in names):
        raise HTTPException(status_code=400, detail="Uploaded Office file does not match its content")


def _normalized_filename(filename: str, extension: str) -> str:
    stem = filename.rsplit(".", 1)[0].strip()
    safe_stem = re.sub(r"[^A-Za-z0-9._-]+", "-", stem).strip(".-_")[:80]
    return f"{safe_stem or 'attachment'}.{extension}"
