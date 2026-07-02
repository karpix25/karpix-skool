from app.services.mux_uploads import get_mux_direct_upload_cors_origin


def test_mux_direct_upload_cors_origin_uses_frontend_origin_in_production():
    origin = get_mux_direct_upload_cors_origin(
        environment="production",
        frontend_url="https://webapp.karpix.com/admin",
    )

    assert origin == "https://webapp.karpix.com"


def test_mux_direct_upload_cors_origin_allows_dev_fallback():
    origin = get_mux_direct_upload_cors_origin(
        environment="development",
        frontend_url="https://webapp.karpix.com",
    )

    assert origin == "*"
