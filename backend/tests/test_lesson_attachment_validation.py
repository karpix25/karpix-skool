from io import BytesIO
import zipfile

import pytest
from fastapi import HTTPException, UploadFile

from app.services.lesson_attachment_validation import read_validated_lesson_attachment_upload


def upload_file(content: bytes, content_type: str, filename: str) -> UploadFile:
    return UploadFile(filename=filename, file=BytesIO(content), headers={"content-type": content_type})


def zip_bytes(files: dict[str, bytes]) -> bytes:
    buffer = BytesIO()
    with zipfile.ZipFile(buffer, "w") as archive:
        for name, content in files.items():
            archive.writestr(name, content)
    return buffer.getvalue()


@pytest.mark.asyncio
async def test_lesson_attachment_validation_accepts_docx_octet_stream_by_extension():
    content = zip_bytes({"[Content_Types].xml": b"types", "word/document.xml": b"doc"})

    validated = await read_validated_lesson_attachment_upload(
        upload_file(content, "application/octet-stream", "../Lesson Plan.docx")
    )

    assert validated.content == content
    assert validated.content_type == "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    assert validated.filename == "Lesson-Plan.docx"
    assert validated.size_bytes == len(content)


@pytest.mark.asyncio
async def test_lesson_attachment_validation_rejects_empty_file():
    with pytest.raises(HTTPException) as exc_info:
        await read_validated_lesson_attachment_upload(upload_file(b"", "text/plain", "notes.txt"))

    assert exc_info.value.status_code == 400


@pytest.mark.asyncio
async def test_lesson_attachment_validation_rejects_dangerous_inner_extension():
    with pytest.raises(HTTPException) as exc_info:
        await read_validated_lesson_attachment_upload(
            upload_file(b"%PDF-1.7", "application/pdf", "invoice.exe.pdf")
        )

    assert exc_info.value.status_code == 400


@pytest.mark.asyncio
async def test_lesson_attachment_validation_rejects_fake_image_mime():
    with pytest.raises(HTTPException) as exc_info:
        await read_validated_lesson_attachment_upload(
            upload_file(b"not-a-real-png", "image/png", "diagram.png")
        )

    assert exc_info.value.status_code == 400


@pytest.mark.asyncio
async def test_lesson_attachment_validation_rejects_oversize_without_unbounded_read():
    content = b"%PDF-1.7" + (b"x" * 8)

    with pytest.raises(HTTPException) as exc_info:
        await read_validated_lesson_attachment_upload(
            upload_file(content, "application/pdf", "large.pdf"),
            max_bytes=10,
        )

    assert exc_info.value.status_code == 413
