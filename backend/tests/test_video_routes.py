import uuid
import sys
import types

from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient

fake_mux = types.ModuleType("mux_python")
fake_mux_rest = types.ModuleType("mux_python.rest")
fake_mux_rest.ApiException = Exception
sys.modules.setdefault("mux_python", fake_mux)
sys.modules.setdefault("mux_python.rest", fake_mux_rest)

from app.db import get_session
from app.routes import video
from app.utils.security import get_managed_lesson


class FakeSession:
    pass


def build_test_app() -> FastAPI:
    app = FastAPI()
    app.include_router(video.router, prefix="/video")

    async def deny_lesson_access():
        raise HTTPException(status_code=403, detail="No lesson access")

    async def override_session():
        return FakeSession()

    app.dependency_overrides[get_managed_lesson] = deny_lesson_access
    app.dependency_overrides[get_session] = override_session
    return app


def test_upload_url_requires_managed_lesson_access():
    response = TestClient(build_test_app()).get(
        f"/video/upload-url?lesson_id={uuid.uuid4()}"
    )

    assert response.status_code == 403
    assert response.json()["detail"] == "No lesson access"
