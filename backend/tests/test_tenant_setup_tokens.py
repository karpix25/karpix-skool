import uuid
from datetime import datetime, timedelta

import pytest

from app.models import Tenant, TenantSetupScope, TenantSetupToken
from app.services.tenant_setup_tokens import (
    SetupTokenFailure,
    hash_setup_token,
    issue_tenant_setup_token,
    resolve_tenant_setup_token,
    validate_setup_token_record,
)


class FakeScalars:
    def all(self):
        return []


class FakeResult:
    def scalars(self):
        return FakeScalars()


class FakeSession:
    def __init__(self):
        self.added = []

    async def execute(self, _statement):
        return FakeResult()

    def add(self, item):
        self.added.append(item)


@pytest.mark.asyncio
async def test_issue_setup_token_stores_hash_only():
    tenant_id = uuid.uuid4()
    user_id = uuid.uuid4()
    session = FakeSession()

    issue = await issue_tenant_setup_token(
        session,
        tenant_id=tenant_id,
        scope=TenantSetupScope.free_group_link,
        created_by_user_id=user_id,
    )

    assert issue.token.startswith("SETUP2-")
    assert issue.record.token_hash == hash_setup_token(issue.token)
    assert issue.record.token_hash != issue.token
    assert issue.record.tenant_id == tenant_id
    assert issue.record.created_by_user_id == user_id
    assert issue.record in session.added
    assert not hasattr(issue.record, "token")


@pytest.mark.asyncio
async def test_issue_setup_token_revokes_previous_active_token_before_rotation():
    now = datetime(2026, 7, 14, 12, 0)
    previous = TenantSetupToken(
        tenant_id=uuid.uuid4(),
        token_hash="a" * 64,
        scope=TenantSetupScope.owner_invite,
        expires_at=now + timedelta(days=1),
    )

    class ActiveScalars:
        def all(self):
            return [previous]

    class ActiveResult:
        def scalars(self):
            return ActiveScalars()

    class RotationSession:
        def __init__(self):
            self.added = []

        async def execute(self, _statement):
            return ActiveResult()

        def add(self, item):
            self.added.append(item)

    session = RotationSession()
    issue = await issue_tenant_setup_token(
        session,
        tenant_id=previous.tenant_id,
        scope=TenantSetupScope.owner_invite,
        now=now,
    )

    assert previous.used_at == now
    assert issue.record.used_at is None
    assert issue.record.token_hash != previous.token_hash
    assert previous in session.added
    assert issue.record in session.added


@pytest.mark.asyncio
async def test_resolve_setup_token_locks_token_and_tenant_for_atomic_claim():
    tenant = Tenant(id=uuid.uuid4(), name="School")
    raw_token = "SETUP2-atomic"
    record = TenantSetupToken(
        tenant_id=tenant.id,
        token_hash=hash_setup_token(raw_token),
        scope=TenantSetupScope.owner_invite,
        expires_at=datetime.utcnow() + timedelta(hours=1),
    )

    class ScalarResult:
        def __init__(self, value):
            self.value = value

        def scalars(self):
            return self

        def first(self):
            return self.value

    class RecordingSession:
        def __init__(self):
            self.statements = []
            self.results = [ScalarResult(record), ScalarResult(tenant)]

        async def execute(self, statement):
            self.statements.append(statement)
            return self.results.pop(0)

    session = RecordingSession()
    resolution = await resolve_tenant_setup_token(
        session,
        raw_token,
        lock_for_update=True,
    )

    assert resolution.found is True
    assert all(statement._for_update_arg is not None for statement in session.statements)


def test_validate_setup_token_rejects_expired_token():
    now = datetime.utcnow()
    record = TenantSetupToken(
        tenant_id=uuid.uuid4(),
        token_hash="x" * 64,
        scope=TenantSetupScope.free_group_link,
        expires_at=now - timedelta(seconds=1),
    )

    validation = validate_setup_token_record(
        record,
        expected_scope=TenantSetupScope.free_group_link,
        now=now,
    )

    assert validation.allowed is False
    assert validation.failure == SetupTokenFailure.expired


def test_validate_setup_token_rejects_used_token():
    now = datetime.utcnow()
    record = TenantSetupToken(
        tenant_id=uuid.uuid4(),
        token_hash="x" * 64,
        scope=TenantSetupScope.free_group_link,
        expires_at=now + timedelta(days=1),
        used_at=now,
    )

    validation = validate_setup_token_record(
        record,
        expected_scope=TenantSetupScope.free_group_link,
        now=now,
    )

    assert validation.allowed is False
    assert validation.failure == SetupTokenFailure.used


def test_validate_setup_token_rejects_wrong_scope():
    now = datetime.utcnow()
    record = TenantSetupToken(
        tenant_id=uuid.uuid4(),
        token_hash="x" * 64,
        scope=TenantSetupScope.free_group_link,
        expires_at=now + timedelta(days=1),
    )

    validation = validate_setup_token_record(
        record,
        expected_scope=TenantSetupScope.vip_group_link,
        now=now,
    )

    assert validation.allowed is False
    assert validation.failure == SetupTokenFailure.wrong_scope
