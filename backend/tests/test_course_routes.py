import uuid

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.db import get_session
from app.routes import course_routes, courses
from app.utils.tenant import get_active_tenant_id


class FakeSession:
    def __init__(self):
        self.added = []
        self.committed = False
        self.refreshed = []

    def add(self, item):
        self.added.append(item)

    async def commit(self):
        self.committed = True

    async def refresh(self, item):
        self.refreshed.append(item)


def build_test_app(fake_session: FakeSession, tenant_id: uuid.UUID) -> FastAPI:
    app = FastAPI()
    app.include_router(courses.router, prefix="/courses")

    async def override_tenant_id():
        return tenant_id

    async def override_session():
        return fake_session

    app.dependency_overrides[get_active_tenant_id] = override_tenant_id
    app.dependency_overrides[get_session] = override_session
    return app


@pytest.mark.parametrize("path", ["/courses", "/courses/"])
def test_create_course_accepts_collection_path_with_or_without_trailing_slash(monkeypatch, path):
    fake_session = FakeSession()
    tenant_id = uuid.uuid4()
    app = build_test_app(fake_session, tenant_id)

    async def fake_invalidate_course_write_caches(**_kwargs):
        return None

    monkeypatch.setattr(
        course_routes,
        "invalidate_course_write_caches",
        fake_invalidate_course_write_caches,
    )

    response = TestClient(app).post(
        path,
        json={
            "title": "Course",
            "description": "",
            "cover_url": "",
            "unlock_type": "open",
            "unlock_value": "1",
            "is_published": False,
            "is_vip": False,
        },
        follow_redirects=False,
    )

    assert response.status_code == 200
    assert response.json()["title"] == "Course"
    assert response.json()["tenant_id"] == str(tenant_id)
    assert fake_session.committed is True
    assert fake_session.refreshed == fake_session.added
