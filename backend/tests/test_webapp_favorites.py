import uuid

import pytest
from fastapi import HTTPException
from sqlalchemy import UniqueConstraint

from app.models import Course, MemberStatus, Tenant, TenantMember, User
from app.models_favorites import CourseFavorite
from app.routes import webapp_favorites
from app.services.webapp.favorites import add_course_favorite, remove_course_favorite


class FakeResult:
    def __init__(self, *, first_value=None, all_value=None):
        self._first_value = first_value
        self._all_value = all_value or []

    def first(self):
        return self._first_value

    def all(self):
        return self._all_value


class FakeSession:
    def __init__(self, objects, exec_results):
        self._objects = {(type(item), item.id): item for item in objects}
        self._exec_results = list(exec_results)
        self.added = []
        self.deleted = []
        self.committed = False
        self.refreshed = []

    async def get(self, model, item_id):
        return self._objects.get((model, item_id))

    async def exec(self, _statement):
        if not self._exec_results:
            raise AssertionError("Unexpected database query")
        return self._exec_results.pop(0)

    def add(self, item):
        self.added.append(item)

    async def delete(self, item):
        self.deleted.append(item)

    async def commit(self):
        self.committed = True

    async def refresh(self, item):
        self.refreshed.append(item)


def favorite_context():
    tenant = Tenant(id=uuid.uuid4(), name="School")
    user = User(id=uuid.uuid4(), username="student", telegram_id=123)
    member = TenantMember(
        tenant_id=tenant.id,
        user_id=user.id,
        status=MemberStatus.active,
    )
    course = Course(
        id=uuid.uuid4(),
        tenant_id=tenant.id,
        title="Guide",
        is_published=True,
    )
    return tenant, user, member, course


@pytest.mark.asyncio
async def test_add_favorite_requires_active_tenant_membership():
    tenant, user, _member, course = favorite_context()
    session = FakeSession(
        [tenant, user, course],
        [FakeResult(first_value=None)],
    )

    with pytest.raises(HTTPException) as exc_info:
        await add_course_favorite(
            session=session,
            current_user=user,
            course_id=course.id,
        )

    assert exc_info.value.status_code == 403
    assert session.added == []
    assert session.committed is False


@pytest.mark.asyncio
async def test_add_favorite_is_idempotent_for_existing_record():
    tenant, user, member, course = favorite_context()
    favorite = CourseFavorite(
        tenant_id=tenant.id,
        user_id=user.id,
        course_id=course.id,
    )
    session = FakeSession(
        [tenant, user, member, course, favorite],
        [FakeResult(first_value=member), FakeResult(first_value=favorite)],
    )

    result = await add_course_favorite(
        session=session,
        current_user=user,
        course_id=course.id,
    )

    assert result is favorite
    assert session.added == []
    assert session.committed is False


@pytest.mark.asyncio
async def test_remove_favorite_allows_unpublished_course():
    tenant, user, member, course = favorite_context()
    course.is_published = False
    favorite = CourseFavorite(
        tenant_id=tenant.id,
        user_id=user.id,
        course_id=course.id,
    )
    session = FakeSession(
        [tenant, user, member, course, favorite],
        [FakeResult(first_value=member), FakeResult(first_value=favorite)],
    )

    await remove_course_favorite(
        session=session,
        current_user=user,
        course_id=course.id,
    )

    assert session.deleted == [favorite]
    assert session.committed is True


def test_favorite_unique_constraint_scopes_user_tenant_and_course():
    constraints = [item for item in CourseFavorite.__table_args__ if isinstance(item, UniqueConstraint)]
    assert any(
        tuple(constraint.columns.keys()) == ("user_id", "tenant_id", "course_id")
        for constraint in constraints
    )


@pytest.mark.asyncio
async def test_list_favorites_returns_progress_and_access_fields(monkeypatch):
    tenant, user, member, course = favorite_context()
    favorite = CourseFavorite(
        tenant_id=tenant.id,
        user_id=user.id,
        course_id=course.id,
    )
    session = FakeSession(
        [tenant, user, member, course, favorite],
        [FakeResult(all_value=[(favorite, course)])],
    )

    async def fake_tenant_access(**_kwargs):
        return tenant

    async def fake_membership(*_args, **_kwargs):
        return member

    async def fake_is_admin(*_args, **_kwargs):
        return False

    async def fake_check_access(*_args, **_kwargs):
        return True, "🔒 Доступ закрыт"

    async def fake_progress(**_kwargs):
        return type("Progress", (), {"course_progress": {"progress_percent": 42}})()

    monkeypatch.setattr(webapp_favorites, "ensure_favorite_tenant_access", fake_tenant_access)
    monkeypatch.setattr(webapp_favorites, "ensure_active_membership", fake_membership)
    monkeypatch.setattr(webapp_favorites, "is_tenant_admin_member", fake_is_admin)
    monkeypatch.setattr(webapp_favorites, "check_access", fake_check_access)
    monkeypatch.setattr(webapp_favorites, "get_course_progress_detail", fake_progress)

    response = await webapp_favorites.list_student_favorites(
        tenant_id=tenant.id,
        session=session,
        current_user=user,
    )

    assert response[0]["progress_percent"] == 42
    assert response[0]["is_unlocked"] is False
    assert response[0]["lock_reason"] == "🔒 Доступ закрыт"
    assert response[0]["is_favorite"] is True
