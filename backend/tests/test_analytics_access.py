import uuid

import pytest

from app.models import User
from app.routes import analytics


class FakeResult:
    def all(self):
        return []


class RecordingSession:
    def __init__(self):
        self.statements = []

    async def exec(self, statement):
        self.statements.append(statement)
        return FakeResult()


@pytest.mark.asyncio
async def test_analytics_tenant_scope_requires_active_management_membership():
    user = User(id=uuid.uuid4(), telegram_id=123)
    session = RecordingSession()

    response = await analytics.get_analytics(current_user=user, session=session)

    assert response["kpis"]["total_students"] == 0
    scope_sql = str(session.statements[0]).lower()
    assert "tenantmember.status" in scope_sql
    assert "tenantmember.deleted_at is null" in scope_sql
    assert "tenantmember.role" in scope_sql
