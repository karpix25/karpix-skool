import uuid

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.db import get_session
from app.models import Tenant, User
from app.routes import debug
from app.routes.auth import get_super_user


class FakeSession:
    def __init__(self, tenant: Tenant | None = None):
        self.tenant = tenant

    async def get(self, _model, _item_id):
        return self.tenant


def _debug_client(fake_session: FakeSession):
    app = FastAPI()
    app.include_router(debug.router, prefix="/debug")

    async def override_super_user():
        return User(id=uuid.uuid4(), is_super_admin=True)

    async def override_session():
        return fake_session

    app.dependency_overrides[get_super_user] = override_super_user
    app.dependency_overrides[get_session] = override_session
    return TestClient(app)


def test_debug_tenant_masks_setup_code(monkeypatch):
    monkeypatch.setattr(debug.settings, "ENVIRONMENT", "development")
    tenant = Tenant(id=uuid.uuid4(), name="School", setup_code="START-secret-token")
    client = _debug_client(FakeSession(tenant))

    response = client.get(f"/debug/tenant/{tenant.id}")

    assert response.status_code == 200
    body = response.json()
    assert body["setup_code"] == "START-...oken"
    assert body["setup_code_masked"] is True
    assert body["setup_code"] != tenant.setup_code


def test_debug_routes_are_disabled_in_production(monkeypatch):
    monkeypatch.setattr(debug.settings, "ENVIRONMENT", "production")
    client = _debug_client(FakeSession())

    response = client.get(f"/debug/tenant/{uuid.uuid4()}")

    assert response.status_code == 404
