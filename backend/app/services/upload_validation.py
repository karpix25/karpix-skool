from dataclasses import dataclass

from fastapi import HTTPException, UploadFile


MAX_IMAGE_UPLOAD_BYTES = 8 * 1024 * 1024
UPLOAD_READ_CHUNK_BYTES = 64 * 1024


@dataclass(frozen=True)
class ValidatedImageUpload:
    content: bytes
    content_type: str
    filename: str


IMAGE_TYPES = {
    "image/jpeg": ("jpg", lambda data: data.startswith(b"\xff\xd8\xff")),
    "image/png": ("png", lambda data: data.startswith(b"\x89PNG\r\n\x1a\n")),
    "image/webp": (
        "webp",
        lambda data: len(data) >= 12 and data[:4] == b"RIFF" and data[8:12] == b"WEBP",
    ),
}


async def read_validated_image_upload(
    file: UploadFile,
    *,
    max_bytes: int = MAX_IMAGE_UPLOAD_BYTES,
) -> ValidatedImageUpload:
    content_type = (file.content_type or "").split(";", 1)[0].lower()
    if content_type not in IMAGE_TYPES:
        raise HTTPException(status_code=400, detail="Only JPEG, PNG, and WebP images are allowed")

    content = await _read_limited(file, max_bytes=max_bytes)
    if not content:
        raise HTTPException(status_code=400, detail="Uploaded image is empty")

    detected_type = _detect_image_type(content)
    if detected_type != content_type:
        raise HTTPException(status_code=400, detail="Uploaded image type does not match its content")

    extension = IMAGE_TYPES[detected_type][0]
    return ValidatedImageUpload(
        content=content,
        content_type=detected_type,
        filename=_normalized_image_filename(file.filename, extension),
    )


async def _read_limited(file: UploadFile, *, max_bytes: int) -> bytes:
    content = bytearray()
    while len(content) <= max_bytes:
        read_size = min(UPLOAD_READ_CHUNK_BYTES, max_bytes + 1 - len(content))
        chunk = await file.read(read_size)
        if not chunk:
            return bytes(content)
        content.extend(chunk)

    raise HTTPException(status_code=413, detail="Uploaded image is too large")


def _detect_image_type(content: bytes) -> str | None:
    for content_type, (_, matcher) in IMAGE_TYPES.items():
        if matcher(content):
            return content_type
    return None


def _normalized_image_filename(filename: str | None, extension: str) -> str:
    raw_name = (filename or "image").replace("\\", "/").rsplit("/", 1)[-1]
    stem = raw_name.rsplit(".", 1)[0] or "image"
    safe_stem = "".join(char for char in stem if char.isalnum() or char in "._-")[:80]
    return f"{safe_stem or 'image'}.{extension}"
