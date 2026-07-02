import sys
import types

from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient

fake_google = sys.modules.setdefault("google", types.ModuleType("google"))
fake_genai = types.ModuleType("google.generativeai")
setattr(fake_google, "generativeai", fake_genai)
sys.modules.setdefault("google.generativeai", fake_genai)

from app.routes import ai
from app.utils.tenant import get_active_tenant_id


def build_test_app() -> FastAPI:
    app = FastAPI()
    app.include_router(ai.router, prefix="/ai")

    async def deny_tenant_access():
        raise HTTPException(status_code=403, detail="No tenant access")

    app.dependency_overrides[get_active_tenant_id] = deny_tenant_access
    return app


def test_generate_suggestion_requires_tenant_management_access():
    response = TestClient(build_test_app()).post(
        "/ai/generate-suggestion",
        json={"prompt": "Suggest a title"},
    )

    assert response.status_code == 403
    assert response.json()["detail"] == "No tenant access"
