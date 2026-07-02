import pytest
from fastapi import HTTPException
from starlette.requests import Request

from app.services.upload_urls import build_uploaded_file_url, validate_upload_key


def make_request(headers: list[tuple[bytes, bytes]]) -> Request:
    return Request(
        {
            "type": "http",
            "method": "POST",
            "path": "/upload/upload",
            "headers": headers,
            "scheme": "http",
            "server": ("127.0.0.1", 8000),
        }
    )


def test_build_uploaded_file_url_uses_forwarded_host_and_proto():
    request = make_request(
        [
            (b"host", b"127.0.0.1"),
            (b"x-forwarded-host", b"api.karpix.com"),
            (b"x-forwarded-proto", b"https"),
        ]
    )

    assert (
        build_uploaded_file_url(request, "oblozhki/example.png")
        == "https://api.karpix.com/upload/files/oblozhki/example.png"
    )


def test_build_uploaded_file_url_uses_first_forwarded_value():
    request = make_request(
        [
            (b"host", b"127.0.0.1"),
            (b"x-forwarded-host", b"api.karpix.com, internal.local"),
            (b"x-forwarded-proto", b"https, http"),
        ]
    )

    assert (
        build_uploaded_file_url(request, "avatars/user.png")
        == "https://api.karpix.com/upload/files/avatars/user.png"
    )


def test_build_uploaded_file_url_falls_back_to_request_host():
    request = make_request([(b"host", b"127.0.0.1:8000")])

    assert (
        build_uploaded_file_url(request, "oblozhki/example.png")
        == "http://127.0.0.1:8000/upload/files/oblozhki/example.png"
    )


def test_validate_upload_key_allows_known_prefixes():
    validate_upload_key("oblozhki/example.png")
    validate_upload_key("avatars/user.jpg")


def test_validate_upload_key_rejects_unknown_or_unsafe_keys():
    for key in ["private/example.png", "../secret", "/oblozhki/example.png", "oblozhki/../secret"]:
        with pytest.raises(HTTPException) as exc_info:
            validate_upload_key(key)
        assert exc_info.value.status_code == 404
