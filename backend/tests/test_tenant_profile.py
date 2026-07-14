from app.models import Tenant
from app.routes.tenants import build_tenant_read, normalize_school_description
from app.routes.webapp import build_webapp_tenant_payload


def test_school_description_is_trimmed_or_cleared():
    assert normalize_school_description("  Школа практического дизайна  ") == "Школа практического дизайна"
    assert normalize_school_description("   ") is None
    assert normalize_school_description(None) is None


def test_school_description_is_returned_to_admin_and_student_clients():
    tenant = Tenant(name="Школа", description="Практика без воды")

    assert build_tenant_read(tenant).description == "Практика без воды"
    assert build_webapp_tenant_payload(tenant)["description"] == "Практика без воды"
