import uuid

import pytest

from app.models import Course, MemberRole, MemberStatus, Tenant, TenantMember
from app.services.webapp import access


def make_vip_context():
    tenant = Tenant(id=uuid.uuid4(), name="School", telegram_group_id=-1001, telegram_group_id_vip=-1002)
    membership = TenantMember(
        id=uuid.uuid4(),
        tenant_id=tenant.id,
        user_id=uuid.uuid4(),
        role=MemberRole.student,
        status=MemberStatus.active,
    )
    course = Course(id=uuid.uuid4(), tenant_id=tenant.id, title="VIP Course", is_published=True, is_vip=True)
    return tenant, membership, course


@pytest.mark.asyncio
async def test_vip_course_locks_regular_student_without_vip_group(monkeypatch):
    tenant, membership, course = make_vip_context()

    async def fake_check_vip_membership(_telegram_id, _tenant):
        return False

    monkeypatch.setattr(access, "check_vip_membership", fake_check_vip_membership)

    is_locked, reason = await access.check_access(course, membership, tenant, user_tg_id=123)

    assert is_locked is True
    assert reason == "💎 ТОЛЬКО ДЛЯ VIP"


@pytest.mark.asyncio
async def test_vip_course_allows_student_with_vip_group(monkeypatch):
    tenant, membership, course = make_vip_context()

    async def fake_check_vip_membership(_telegram_id, _tenant):
        return True

    monkeypatch.setattr(access, "check_vip_membership", fake_check_vip_membership)

    is_locked, reason = await access.check_access(course, membership, tenant, user_tg_id=123)

    assert is_locked is False
    assert reason is None


@pytest.mark.asyncio
async def test_admin_preview_does_not_bypass_vip_group(monkeypatch):
    tenant, membership, course = make_vip_context()

    async def fake_check_vip_membership(_telegram_id, _tenant):
        return False

    monkeypatch.setattr(access, "check_vip_membership", fake_check_vip_membership)

    is_locked, reason = await access.check_access(course, membership, tenant, user_tg_id=123, is_admin=True)

    assert is_locked is True
    assert reason == "💎 ТОЛЬКО ДЛЯ VIP"


@pytest.mark.asyncio
async def test_vip_group_alone_does_not_replace_school_membership(monkeypatch):
    tenant, _membership, course = make_vip_context()

    async def fake_check_vip_membership(_telegram_id, _tenant):
        return True

    monkeypatch.setattr(access, "check_vip_membership", fake_check_vip_membership)

    is_locked, reason = await access.check_access(course, None, tenant, user_tg_id=123)

    assert is_locked is True
    assert reason == "ACCESS DENIED"
