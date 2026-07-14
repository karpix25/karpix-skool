from datetime import datetime, timedelta
import uuid

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.db import get_session
from app.models import Tenant, TenantSetupScope, TenantSetupToken, User
from app.routes import super_invites
from app.routes.auth import get_super_user
from app.services.owner_invites import (
    OwnerInviteLifecycleStatus,
    OwnerInviteStatus,
)
from app.services.tenant_setup_tokens import SetupTokenIssue, hash_setup_token


class InviteSession:
    def __init__(self, tenant: Tenant):
        self.tenant = tenant
        self.added = []
        self.commit_count = 0

    async def get(self, model, item_id):
        if model is Tenant and item_id == self.tenant.id:
            return self.tenant
        return None

    async def execute(self, _statement):
        session = self

        class TenantScalarResult:
            def scalars(self):
                return self

            def first(self):
                return session.tenant

        return TenantScalarResult()

    def add(self, item):
        self.added.append(item)

    async def commit(self):
        self.commit_count += 1

    async def refresh(self, _item):
        return None


def build_client(session, *, authorize: bool) -> TestClient:
    app = FastAPI()
    app.include_router(super_invites.router, prefix="/super")

    async def override_session():
        return session

    app.dependency_overrides[get_session] = override_session
    if authorize:
        async def override_super_user():
            return User(id=uuid.uuid4(), username="root", is_super_admin=True)

        app.dependency_overrides[get_super_user] = override_super_user
    return TestClient(app)


def test_owner_invite_status_requires_superadmin_authorization():
    tenant = Tenant(name="School")
    response = build_client(InviteSession(tenant), authorize=False).get(
        f"/super/tenants/{tenant.id}/owner-invite"
    )

    assert response.status_code == 401


@pytest.mark.asyncio
async def test_rotate_returns_only_fresh_command_and_commits(monkeypatch):
    tenant = Tenant(name="School")
    session = InviteSession(tenant)
    now = datetime(2026, 7, 14, 12, 0)
    raw_token = "SETUP2-fresh-secret"
    record = TenantSetupToken(
        tenant_id=tenant.id,
        token_hash=hash_setup_token(raw_token),
        scope=TenantSetupScope.owner_invite,
        expires_at=now + timedelta(days=7),
        created_at=now,
    )

    async def issue(*_args, **_kwargs):
        return SetupTokenIssue(token=raw_token, record=record)

    async def activity(*_args, **_kwargs):
        return None

    monkeypatch.setattr(super_invites, "issue_tenant_setup_token", issue)
    monkeypatch.setattr(super_invites, "record_super_activity", activity)

    response = await super_invites.rotate_owner_invite(
        tenant.id,
        User(id=uuid.uuid4(), username="root", is_super_admin=True),
        session,
    )

    assert response.setup_command == f"/setup {raw_token}"
    assert not hasattr(response, "token")
    assert record.token_hash != raw_token
    assert session.commit_count == 1


@pytest.mark.asyncio
async def test_revoke_is_idempotent_and_records_activity_once(monkeypatch):
    tenant = Tenant(name="School")
    session = InviteSession(tenant)
    revoke_results = iter((1, 0))
    activity_count = 0

    async def revoke(*_args, **_kwargs):
        return next(revoke_results)

    async def get_status(*_args, **_kwargs):
        return OwnerInviteStatus(
            tenant_id=tenant.id,
            status=OwnerInviteLifecycleStatus.revoked,
            revoked_at=datetime(2026, 7, 14, 12, 0),
        )

    async def activity(*_args, **_kwargs):
        nonlocal activity_count
        activity_count += 1
        return None

    monkeypatch.setattr(super_invites, "revoke_active_setup_tokens", revoke)
    monkeypatch.setattr(super_invites, "get_owner_invite_status", get_status)
    monkeypatch.setattr(super_invites, "record_super_activity", activity)
    super_user = User(id=uuid.uuid4(), username="root", is_super_admin=True)

    first = await super_invites.revoke_owner_invite(
        tenant.id,
        super_user,
        session,
    )
    second = await super_invites.revoke_owner_invite(
        tenant.id,
        super_user,
        session,
    )

    assert first.status == "revoked"
    assert second.status == "revoked"
    assert session.commit_count == 1
    assert activity_count == 1
