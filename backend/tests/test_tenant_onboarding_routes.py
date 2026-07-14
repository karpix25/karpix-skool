import uuid
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest
from fastapi import HTTPException

from app.routes import tenant_onboarding
from app.services.tenant_onboarding import TenantOnboardingReadinessFacts, TenantOnboardingStatus


def onboarding_status(*, published=True, preview=False, students=0, completed=False):
    return TenantOnboardingStatus(
        courses_count=1 if published else 0,
        published_course_id=uuid.uuid4() if published else None,
        students_count=students,
        has_student_preview=preview,
        is_completed=completed,
    )


def ready_facts():
    return TenantOnboardingReadinessFacts(
        has_school_profile=True,
        has_serving_subscription=True,
    )


@pytest.mark.asyncio
async def test_student_preview_requires_a_published_lesson(monkeypatch):
    tenant = SimpleNamespace(id=uuid.uuid4(), telegram_group_id=1, telegram_group_id_vip=None)
    user = SimpleNamespace(id=uuid.uuid4())
    session = AsyncMock()
    monkeypatch.setattr(
        tenant_onboarding,
        "ensure_owner_or_super_admin_access",
        AsyncMock(return_value=tenant),
    )
    monkeypatch.setattr(
        tenant_onboarding,
        "get_tenant_onboarding_status",
        AsyncMock(return_value=onboarding_status(published=False)),
    )

    with pytest.raises(HTTPException) as error:
        await tenant_onboarding.confirm_student_preview(tenant.id, user, session)

    assert error.value.status_code == 409
    session.commit.assert_not_awaited()


@pytest.mark.asyncio
async def test_student_preview_records_a_tenant_scoped_event(monkeypatch):
    tenant = SimpleNamespace(id=uuid.uuid4(), telegram_group_id=1, telegram_group_id_vip=None)
    user = SimpleNamespace(id=uuid.uuid4())
    session = AsyncMock()
    before = onboarding_status(published=True)
    after = onboarding_status(published=True, preview=True)
    record_event = AsyncMock()
    monkeypatch.setattr(
        tenant_onboarding,
        "ensure_owner_or_super_admin_access",
        AsyncMock(return_value=tenant),
    )
    monkeypatch.setattr(
        tenant_onboarding,
        "get_tenant_onboarding_status",
        AsyncMock(side_effect=[before, after]),
    )
    monkeypatch.setattr(tenant_onboarding, "record_super_activity", record_event)
    monkeypatch.setattr(
        tenant_onboarding,
        "get_tenant_onboarding_readiness_facts",
        AsyncMock(return_value=ready_facts()),
    )

    response = await tenant_onboarding.confirm_student_preview(tenant.id, user, session)

    assert response.has_student_preview is True
    assert record_event.await_args.kwargs["tenant_id"] == tenant.id
    assert record_event.await_args.kwargs["actor_user_id"] == user.id
    assert str(tenant.id) in record_event.await_args.kwargs["dedupe_key"]
    session.commit.assert_awaited_once()


@pytest.mark.asyncio
async def test_completion_rejects_school_without_confirmed_preview(monkeypatch):
    tenant = SimpleNamespace(id=uuid.uuid4(), telegram_group_id=1, telegram_group_id_vip=None)
    user = SimpleNamespace(id=uuid.uuid4())
    session = AsyncMock()
    monkeypatch.setattr(
        tenant_onboarding,
        "ensure_owner_or_super_admin_access",
        AsyncMock(return_value=tenant),
    )
    monkeypatch.setattr(
        tenant_onboarding,
        "get_tenant_onboarding_status",
        AsyncMock(return_value=onboarding_status(published=True, preview=False, students=1)),
    )
    monkeypatch.setattr(
        tenant_onboarding,
        "get_tenant_onboarding_readiness_facts",
        AsyncMock(return_value=ready_facts()),
    )

    with pytest.raises(HTTPException) as error:
        await tenant_onboarding.complete_tenant_onboarding(tenant.id, user, session)

    assert error.value.status_code == 409
    session.commit.assert_not_awaited()


@pytest.mark.asyncio
async def test_completion_rejects_incomplete_profile_or_non_serving_subscription(monkeypatch):
    tenant = SimpleNamespace(id=uuid.uuid4(), telegram_group_id=1, telegram_group_id_vip=None)
    user = SimpleNamespace(id=uuid.uuid4())
    session = AsyncMock()
    monkeypatch.setattr(
        tenant_onboarding,
        "ensure_owner_or_super_admin_access",
        AsyncMock(return_value=tenant),
    )
    monkeypatch.setattr(
        tenant_onboarding,
        "get_tenant_onboarding_status",
        AsyncMock(return_value=onboarding_status(published=True, preview=True, students=1)),
    )
    monkeypatch.setattr(
        tenant_onboarding,
        "get_tenant_onboarding_readiness_facts",
        AsyncMock(return_value=TenantOnboardingReadinessFacts(
            has_school_profile=False,
            has_serving_subscription=False,
        )),
    )

    with pytest.raises(HTTPException) as error:
        await tenant_onboarding.complete_tenant_onboarding(tenant.id, user, session)

    assert error.value.status_code == 409
    session.commit.assert_not_awaited()
