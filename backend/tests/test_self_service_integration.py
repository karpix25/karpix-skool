from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
import uuid

import pytest
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlmodel.ext.asyncio.session import AsyncSession

from app.models import (
    MemberRole,
    MemberRoleSource,
    MemberStatus,
    Tenant,
    TenantMember,
    User,
    SubscriptionStatus,
)
from app.models_subscription import (
    SubscriptionLifecycleStatus,
    TenantPlan,
    TenantSubscription,
)
from app.routes import super_admin as legacy_super_admin
from app.routes import super_subscriptions
from app.routes.super_admin import TenantUpdate
from app.routes.super_subscriptions import update_subscription
from app.schemas.subscriptions import SubscriptionUpdate
from app.services import subscriptions
from app.services.subscription_usage import SubscriptionUsageSnapshot
from app.services.tenant_access import ensure_tenant_access, transfer_tenant_ownership
from app.services.telegram import TelegramMembershipCheck, TelegramMembershipState
from app.services.webapp import group_membership
from bot.handlers_activity import _sync_member_role


def make_plan(**overrides) -> TenantPlan:
    values = {
        "code": "trial",
        "name": "Trial",
        "max_courses": 1,
        "max_students": 1,
        "max_ai_jobs_per_month": 1,
        "trial_days": 7,
    }
    values.update(overrides)
    return TenantPlan(**values)


def make_subscription(tenant: Tenant, plan: TenantPlan, *, status, end) -> TenantSubscription:
    return TenantSubscription(
        tenant_id=tenant.id,
        plan_id=plan.id,
        status=status,
        current_period_end=end,
        trial_ends_at=end if status == SubscriptionLifecycleStatus.trialing else None,
    )


@pytest.mark.asyncio
async def test_tenant_a_roles_cannot_cross_into_tenant_b():
    engine = create_async_engine("sqlite+aiosqlite://")
    tables = [User.__table__, Tenant.__table__, TenantMember.__table__]
    async with engine.begin() as connection:
        await connection.run_sync(
            lambda sync_connection: User.metadata.create_all(
                sync_connection,
                tables=tables,
            )
        )

    maker = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with maker() as session:
        owner_a = User(username="owner-a")
        admin_a = User(username="admin-a")
        student_a = User(username="student-a")
        superadmin = User(username="root", is_super_admin=True)
        tenant_a = Tenant(name="A", owner_user_id=owner_a.id)
        tenant_b = Tenant(name="B")
        session.add_all([owner_a, admin_a, student_a, superadmin, tenant_a, tenant_b])
        session.add_all(
            [
                TenantMember(
                    tenant_id=tenant_a.id,
                    user_id=owner_a.id,
                    role=MemberRole.owner,
                ),
                TenantMember(
                    tenant_id=tenant_a.id,
                    user_id=admin_a.id,
                    role=MemberRole.admin,
                ),
                TenantMember(
                    tenant_id=tenant_a.id,
                    user_id=student_a.id,
                    role=MemberRole.student,
                ),
            ]
        )
        await session.commit()

        assert await ensure_tenant_access(tenant_a.id, owner_a, session) is not None
        assert await ensure_tenant_access(tenant_a.id, admin_a, session) is not None
        for user in (owner_a, admin_a, student_a):
            with pytest.raises(HTTPException) as exc_info:
                await ensure_tenant_access(tenant_b.id, user, session)
            assert exc_info.value.status_code == 403
        assert await ensure_tenant_access(tenant_b.id, superadmin, session) is None

    await engine.dispose()


def test_subscription_entitlement_accepts_api_timezone_aware_end_date():
    tenant = Tenant(name="School")
    plan = make_plan()
    aware_end = datetime.now(timezone.utc) + timedelta(days=7)
    subscription = make_subscription(
        tenant,
        plan,
        status=SubscriptionLifecycleStatus.active,
        end=aware_end,
    )

    entitlement = subscriptions.build_entitlement(subscription, plan)

    assert entitlement.is_write_allowed is True


class SubscriptionRouteResult:
    def __init__(self, value):
        self.value = value

    def first(self):
        return self.value


class SubscriptionRouteSession:
    def __init__(self, tenant, subscription, plan):
        self.tenant = tenant
        self.subscription = subscription
        self.plan = plan
        self.added = []

    async def get(self, model, item_id):
        return self.tenant if model is Tenant and item_id == self.tenant.id else None

    async def exec(self, _statement):
        return SubscriptionRouteResult((self.subscription, self.plan))

    def add(self, item):
        self.added.append(item)

    async def commit(self):
        return None

    async def refresh(self, _item):
        return None


@pytest.mark.asyncio
async def test_superadmin_trial_extension_updates_effective_trial_deadline(monkeypatch):
    tenant = Tenant(name="Trial School")
    plan = make_plan()
    original_end = datetime.utcnow() + timedelta(days=1)
    extended_end = datetime.utcnow() + timedelta(days=14)
    subscription = make_subscription(
        tenant,
        plan,
        status=SubscriptionLifecycleStatus.trialing,
        end=original_end,
    )
    session = SubscriptionRouteSession(tenant, subscription, plan)

    async def no_usage(*_args, **_kwargs):
        return SubscriptionUsageSnapshot()

    monkeypatch.setattr(super_subscriptions, "get_subscription_usage", no_usage)

    response = await update_subscription(
        tenant.id,
        SubscriptionUpdate(
            current_period_end=extended_end,
            reason="Продление тестового периода",
        ),
        User(id=uuid.uuid4(), username="root", is_super_admin=True),
        session,
    )

    assert subscription.current_period_end == extended_end
    assert subscription.trial_ends_at == extended_end
    assert response.is_write_allowed is True


class LegacyToggleSession:
    def __init__(self, tenant, subscription, plan):
        self.tenant = tenant
        self.subscription = subscription
        self.plan = plan
        self.added = []

    async def get(self, model, item_id):
        if model is Tenant and item_id == self.tenant.id:
            return self.tenant
        return None

    async def exec(self, _statement):
        return SubscriptionRouteResult((self.subscription, self.plan))

    def add(self, item):
        self.added.append(item)

    async def commit(self):
        return None

    async def refresh(self, _item):
        return None


@pytest.mark.asyncio
async def test_legacy_superadmin_pause_updates_authoritative_subscription(monkeypatch):
    tenant = Tenant(name="School", subscription_status=SubscriptionStatus.active)
    plan = make_plan()
    subscription = make_subscription(
        tenant,
        plan,
        status=SubscriptionLifecycleStatus.active,
        end=datetime.utcnow() + timedelta(days=30),
    )
    session = LegacyToggleSession(tenant, subscription, plan)

    async def no_activity(*_args, **_kwargs):
        return None

    async def empty_stats(*_args, **_kwargs):
        return SimpleNamespace(member_count=0, course_count=0)

    monkeypatch.setattr(legacy_super_admin, "record_super_activity", no_activity)
    monkeypatch.setattr(legacy_super_admin, "get_tenant_stat", empty_stats)

    await legacy_super_admin.update_tenant(
        tenant.id,
        TenantUpdate(subscription_status="past_due"),
        User(id=uuid.uuid4(), username="root", is_super_admin=True),
        session,
    )
    entitlement = await subscriptions.resolve_tenant_entitlement(session, tenant)

    assert tenant.subscription_status == SubscriptionStatus.past_due
    assert subscription.status == SubscriptionLifecycleStatus.past_due
    assert entitlement.is_write_allowed is False


class MembershipSyncResult:
    def __init__(self, *, first_value=None, one_value=None):
        self.first_value = first_value
        self.one_value = one_value

    def first(self):
        return self.first_value

    def one(self):
        return self.one_value


class MembershipSyncSession:
    def __init__(self, results):
        self.results = list(results)
        self.added = []

    async def exec(self, _statement):
        return self.results.pop(0)

    def add(self, item):
        self.added.append(item)

    async def commit(self):
        return None

    async def refresh(self, _item):
        return None


@pytest.mark.asyncio
async def test_webapp_membership_sync_cannot_bypass_student_quota(monkeypatch):
    tenant = Tenant(name="Full School", telegram_group_id=-1001)
    user = User(telegram_id=101, username="student")
    plan = make_plan(max_students=1)
    subscription = make_subscription(
        tenant,
        plan,
        status=SubscriptionLifecycleStatus.active,
        end=datetime.utcnow() + timedelta(days=30),
    )
    session = MembershipSyncSession(
        [
            MembershipSyncResult(first_value=(subscription, plan)),
            MembershipSyncResult(one_value=1),
        ]
    )

    async def verified_member(_telegram_id, _tenant):
        return TelegramMembershipCheck(
            TelegramMembershipState.verified,
            MemberRole.student,
        )

    monkeypatch.setattr(
        group_membership,
        "check_user_membership_state",
        verified_member,
    )

    with pytest.raises(HTTPException) as exc_info:
        await group_membership.sync_membership_from_telegram_groups(
            session=session,
            current_user=user,
            tenant=tenant,
            membership=None,
        )

    assert exc_info.value.status_code == 409
    assert session.added == []


def test_realtime_telegram_member_update_preserves_manual_admin():
    tenant = Tenant(name="School", owner_user_id=uuid.uuid4())
    user = User(id=uuid.uuid4(), username="manual-admin")
    membership = TenantMember(
        tenant_id=tenant.id,
        user_id=user.id,
        role=MemberRole.admin,
        role_source=MemberRoleSource.manual.value,
        status=MemberStatus.active,
    )
    update = SimpleNamespace(
        new_chat_member=SimpleNamespace(status="member"),
        from_user=SimpleNamespace(id=101),
        chat=SimpleNamespace(id=-1001),
    )

    _sync_member_role(update, tenant, user, membership)

    assert membership.role == MemberRole.admin
    assert membership.role_source == MemberRoleSource.manual.value


def test_realtime_telegram_promotion_records_telegram_role_source():
    tenant = Tenant(name="School", owner_user_id=uuid.uuid4())
    user = User(id=uuid.uuid4(), username="telegram-admin")
    membership = TenantMember(
        tenant_id=tenant.id,
        user_id=user.id,
        role=MemberRole.student,
        role_source=MemberRoleSource.manual.value,
        status=MemberStatus.active,
    )
    update = SimpleNamespace(
        new_chat_member=SimpleNamespace(status="administrator"),
        from_user=SimpleNamespace(id=101),
        chat=SimpleNamespace(id=-1001),
    )

    _sync_member_role(update, tenant, user, membership)

    assert membership.role == MemberRole.admin
    assert membership.role_source == MemberRoleSource.telegram.value


class OwnershipResult:
    def __init__(self, memberships):
        self.memberships = memberships

    def all(self):
        return self.memberships


class OwnershipSession:
    def __init__(self, memberships):
        self.memberships = memberships
        self.added = []

    async def exec(self, _statement):
        return OwnershipResult(self.memberships)

    def add(self, item):
        self.added.append(item)


@pytest.mark.asyncio
async def test_owner_transfer_revokes_old_owner_and_sets_system_provenance():
    old_owner = User(id=uuid.uuid4(), username="old")
    new_owner = User(id=uuid.uuid4(), username="new")
    tenant = Tenant(name="School", owner_user_id=old_owner.id)
    old_membership = TenantMember(
        tenant_id=tenant.id,
        user_id=old_owner.id,
        role=MemberRole.owner,
        role_source=MemberRoleSource.system.value,
    )
    new_membership = TenantMember(
        tenant_id=tenant.id,
        user_id=new_owner.id,
        role=MemberRole.admin,
        role_source=MemberRoleSource.manual.value,
    )
    session = OwnershipSession([old_membership, new_membership])

    await transfer_tenant_ownership(
        tenant=tenant,
        new_owner=new_owner,
        session=session,
    )

    assert old_membership.role == MemberRole.student
    assert old_membership.role_source == MemberRoleSource.system.value
    assert new_membership.role == MemberRole.owner
    assert new_membership.role_source == MemberRoleSource.system.value
