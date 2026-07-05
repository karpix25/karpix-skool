import uuid
from datetime import datetime

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.db import get_session
from app.models import PlatformLead, PlatformLeadStatus, User
from app.routes import leads, super_leads
from app.routes.auth import get_current_user, get_super_user


class FakeResult:
    def __init__(self, items):
        self._items = items

    def all(self):
        return self._items


class FakeSession:
    def __init__(self, platform_leads=None):
        self.platform_leads = {lead.id: lead for lead in platform_leads or []}
        self.added = []
        self.committed = False
        self.refreshed = []

    def add(self, item):
        self.added.append(item)
        if isinstance(item, PlatformLead):
            self.platform_leads[item.id] = item

    async def commit(self):
        self.committed = True

    async def refresh(self, item):
        self.refreshed.append(item)

    async def get(self, model, item_id):
        if model is PlatformLead:
            return self.platform_leads.get(item_id)
        return None

    async def exec(self, _statement):
        active_leads = [
            lead for lead in self.platform_leads.values() if lead.deleted_at is None
        ]
        return FakeResult(
            sorted(active_leads, key=lambda lead: lead.created_at, reverse=True)
        )


def build_public_leads_client(fake_session: FakeSession) -> TestClient:
    app = FastAPI()
    app.include_router(leads.router, prefix="/leads")

    async def override_session():
        return fake_session

    app.dependency_overrides[get_session] = override_session
    return TestClient(app)


def build_super_leads_client(
    fake_session: FakeSession,
    *,
    super_user: User | None = None,
    current_user: User | None = None,
) -> TestClient:
    app = FastAPI()
    app.include_router(super_leads.router, prefix="/super")

    async def override_session():
        return fake_session

    app.dependency_overrides[get_session] = override_session

    if super_user is not None:
        async def override_super_user():
            return super_user

        app.dependency_overrides[get_super_user] = override_super_user

    if current_user is not None:
        async def override_current_user():
            return current_user

        app.dependency_overrides[get_current_user] = override_current_user

    return TestClient(app)


def test_apply_lead_saves_application(monkeypatch):
    fake_session = FakeSession()
    sent_notifications = []

    async def fake_send_lead_notification(lead):
        sent_notifications.append(lead)

    monkeypatch.setattr(leads, "send_lead_notification", fake_send_lead_notification)
    client = build_public_leads_client(fake_session)

    response = client.post(
        "/leads/apply",
        json={
            "name": "Anna",
            "telegram": "@anna",
            "schoolName": "Product School",
            "description": "I want to launch a course platform.",
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "success"
    assert body["message"] == "Application received"

    stored_lead = next(item for item in fake_session.added if isinstance(item, PlatformLead))
    assert body["id"] == str(stored_lead.id)
    assert stored_lead.name == "Anna"
    assert stored_lead.telegram == "@anna"
    assert stored_lead.school_name == "Product School"
    assert stored_lead.description == "I want to launch a course platform."
    assert stored_lead.status == PlatformLeadStatus.new
    assert fake_session.committed is True
    assert fake_session.refreshed == [stored_lead]
    assert len(sent_notifications) == 1
    assert sent_notifications[0].telegram == "@anna"


def test_super_admin_can_list_platform_leads():
    lead = PlatformLead(
        id=uuid.uuid4(),
        name="Anna",
        telegram="@anna",
        school_name="Product School",
        description="Launch request",
        created_at=datetime(2026, 7, 4, 12, 0, 0),
    )
    client = build_super_leads_client(
        FakeSession([lead]),
        super_user=User(id=uuid.uuid4(), is_super_admin=True),
    )

    response = client.get("/super/leads")

    assert response.status_code == 200
    body = response.json()
    assert len(body) == 1
    assert body[0]["id"] == str(lead.id)
    assert body[0]["school_name"] == "Product School"
    assert body[0]["status"] == "new"


def test_regular_user_cannot_list_platform_leads():
    client = build_super_leads_client(
        FakeSession(),
        current_user=User(id=uuid.uuid4(), is_super_admin=False),
    )

    response = client.get("/super/leads")

    assert response.status_code == 403


def test_super_admin_can_update_platform_lead_status():
    lead = PlatformLead(
        id=uuid.uuid4(),
        name="Anna",
        telegram="@anna",
        school_name="Product School",
        description="Launch request",
    )
    super_user = User(id=uuid.uuid4(), is_super_admin=True)
    fake_session = FakeSession([lead])
    client = build_super_leads_client(fake_session, super_user=super_user)

    response = client.patch(
        f"/super/leads/{lead.id}",
        json={"status": "in_progress", "admin_note": "Messaged in Telegram"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "in_progress"
    assert body["admin_note"] == "Messaged in Telegram"
    assert lead.status == PlatformLeadStatus.in_progress
    assert lead.admin_note == "Messaged in Telegram"
    assert lead.handled_by_user_id == super_user.id
    assert lead.handled_at is not None
    assert fake_session.committed is True
    assert fake_session.refreshed == [lead]
