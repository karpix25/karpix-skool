from fastapi import HTTPException, Request


ALLOWED_FILE_PREFIXES = ("oblozhki/", "avatars/")


def get_public_base_url(request: Request) -> str:
    scheme = request.headers.get("x-forwarded-proto", request.url.scheme).split(",")[0]
    host = request.headers.get("x-forwarded-host", request.headers.get("host", request.url.netloc)).split(",")[0]
    return f"{scheme}://{host}"


def build_uploaded_file_url(request: Request, key: str) -> str:
    return f"{get_public_base_url(request)}/upload/files/{key}"


def build_uploaded_file_path(key: str) -> str:
    validate_upload_key(key)
    return f"/upload/files/{key}"


def validate_upload_key(key: str) -> None:
    if ".." in key or key.startswith("/") or not key.startswith(ALLOWED_FILE_PREFIXES):
        raise HTTPException(status_code=404, detail="File not found")
