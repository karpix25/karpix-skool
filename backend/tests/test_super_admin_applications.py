import uuid
from datetime import datetime

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.db import get_session
from app.models import PlatformLead, User, UserAdminStatus
from app.routes import super_admin
from app.routes.auth import get_super_user


class FakeResult:
    def __init__(self, items):
        self._items = items

    def all(self):
        return self._items


class FakeSession:
    def __init__(self, results):
        self.results = list(results)

    async def exec(self, _statement):
        if not self.results:
            return FakeResult([])
        return FakeResult(self.results.pop(0))


def build_super_admin_client(fake_session: FakeSession) -> TestClient:
    app = FastAPI()
    app.include_router(super_admin.router, prefix="/super")

    async def override_session():
        return fake_session

    async def override_super_user():
        return User(id=uuid.uuid4(), is_super_admin=True)

    app.dependency_overrides[get_session] = override_session
    app.dependency_overrides[get_super_user] = override_super_user
    return TestClient(app)


def test_super_admin_lists_author_requests_in_applications():
    user_id = uuid.uuid4()
    user = User(
        id=user_id,
        telegram_id=123,
        username="karlo",
        admin_status=UserAdminStatus.pending,
        admin_request_details={
            "school_name": "AI школа",
            "details": "Хочу запустить cohort",
            "requested_at": "2026-07-12T10:00:00",
        },
        updated_at=datetime(2026, 7, 12, 10, 0, 0),
    )
    client = build_super_admin_client(FakeSession([[], [user]]))

    response = client.get("/super/applications")

    assert response.status_code == 200
    body = response.json()
    assert body == [{
        "id": f"author:{user_id}",
        "kind": "author_request",
        "name": "karlo",
        "telegram": "@karlo",
        "schoolName": "AI школа",
        "description": "Хочу запустить cohort",
        "status": "pending",
        "createdAt": "2026-07-12T10:00:00",
        "source": "Mini App",
        "userId": str(user_id),
        "leadId": None,
    }]


def test_super_admin_applications_merges_platform_leads_and_author_requests():
    lead = PlatformLead(
        id=uuid.uuid4(),
        name="Anna",
        telegram="@anna",
        school_name="Marketing School",
        description="Launch request",
        created_at=datetime(2026, 7, 12, 11, 0, 0),
    )
    user = User(
        id=uuid.uuid4(),
        username="karlo",
        admin_status=UserAdminStatus.pending,
        admin_request_details={"school_name": "AI школа", "details": "Хочу школу"},
        updated_at=datetime(2026, 7, 12, 10, 0, 0),
    )
    client = build_super_admin_client(FakeSession([[lead], [user]]))

    response = client.get("/super/applications")

    assert response.status_code == 200
    body = response.json()
    assert [item["kind"] for item in body] == ["platform_lead", "author_request"]
    assert body[0]["schoolName"] == "Marketing School"
    assert body[1]["schoolName"] == "AI школа"


def test_super_admin_users_keep_admin_request_details_structured():
    details = {"school_name": "AI школа", "details": "Нужна школа"}
    user = User(
        id=uuid.uuid4(),
        telegram_id=123,
        username="karlo",
        admin_status=UserAdminStatus.pending,
        admin_request_details=details,
    )
    client = build_super_admin_client(FakeSession([[user]]))

    response = client.get("/super/users")

    assert response.status_code == 200
    body = response.json()
    assert body[0]["admin_request_details"] == details
