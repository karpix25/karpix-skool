import uuid
from datetime import datetime, timedelta

import pytest

from app.models import TenantSetupScope, TenantSetupToken
from app.services.tenant_setup_tokens import (
    SetupTokenFailure,
    hash_setup_token,
    issue_tenant_setup_token,
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
