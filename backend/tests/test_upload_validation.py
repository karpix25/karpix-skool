from io import BytesIO

import pytest
from fastapi import HTTPException, UploadFile

from app.services.upload_validation import read_validated_image_upload


def upload_file(content: bytes, content_type: str, filename: str = "image.png") -> UploadFile:
    return UploadFile(filename=filename, file=BytesIO(content), headers={"content-type": content_type})


@pytest.mark.asyncio
async def test_read_validated_image_upload_accepts_matching_png_magic():
    png = b"\x89PNG\r\n\x1a\n" + b"payload"

    validated = await read_validated_image_upload(upload_file(png, "image/png", "avatar.svg"))

    assert validated.content == png
    assert validated.content_type == "image/png"
    assert validated.filename.endswith(".png")


@pytest.mark.asyncio
async def test_read_validated_image_upload_rejects_svg_even_with_image_type():
    with pytest.raises(HTTPException) as exc_info:
        await read_validated_image_upload(upload_file(b"<svg></svg>", "image/svg+xml"))

    assert exc_info.value.status_code == 400


@pytest.mark.asyncio
async def test_read_validated_image_upload_rejects_fake_mime():
    with pytest.raises(HTTPException) as exc_info:
        await read_validated_image_upload(upload_file(b"<svg></svg>", "image/png"))

    assert exc_info.value.status_code == 400


@pytest.mark.asyncio
async def test_read_validated_image_upload_rejects_oversize_without_unbounded_read():
    content = b"\xff\xd8\xff" + (b"x" * 8)

    with pytest.raises(HTTPException) as exc_info:
        await read_validated_image_upload(
            upload_file(content, "image/jpeg", "large.jpg"),
            max_bytes=10,
        )

    assert exc_info.value.status_code == 413
