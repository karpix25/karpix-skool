import pytest

from app.services.tenant_branding import (
    UnsafeBrandingValue,
    normalize_accent_color,
    normalize_brand_url,
)


def test_branding_values_are_normalized():
    assert normalize_accent_color(" #12abEF ") == "#12ABEF"
    assert normalize_brand_url(" https://example.com/logo.png ", field_name="Logo URL") == (
        "https://example.com/logo.png"
    )


@pytest.mark.parametrize("value", ["red", "#fff", "#12345G"])
def test_invalid_accent_color_is_rejected(value):
    with pytest.raises(UnsafeBrandingValue):
        normalize_accent_color(value)


@pytest.mark.parametrize("value", ["http://example.com", "javascript:alert(1)", "https://user:pass@example.com"])
def test_unsafe_brand_url_is_rejected(value):
    with pytest.raises(UnsafeBrandingValue):
        normalize_brand_url(value, field_name="Support URL")
