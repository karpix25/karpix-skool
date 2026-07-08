import uuid
from datetime import datetime, timedelta

import pytest

from app.models import Course, Lesson, Module, User
from app.models_agent import (
    AgentApproval,
    AgentApprovalStatus,
    AgentArtifact,
    AgentArtifactType,
    AgentRun,
    AgentRunStatus,
)
from app.models_generation import CourseStructureGenerationJob, LessonGenerationJobStatus
from app.schemas.agent import AgentApprovalDecisionCreate, AgentPublishCreate
from app.services.agent import decisions
from app.services.agent.decisions import AgentRunOperationError
from app.services.agent.queries import list_agent_runs


class FakeResult:
    def __init__(self, items):
        self.items = list(items)

    def all(self):
        return self.items


class FakeSession:
    def __init__(self, objects=None):
        self._objects = {}
        self.added = []
        self.commits = 0
        self.refreshed = []
        for item in objects or []:
            self.add(item)

    async def get(self, model, item_id):
        return self._objects.get((model, item_id))

    async def exec(self, stmt):
        entity = stmt.column_descriptions[0]["entity"]
        params = stmt.compile().params
        items = [item for (model, _item_id), item in self._objects.items() if model is entity]

        if entity is AgentRun and "tenant_id_1" in params:
            items = [item for item in items if item.tenant_id == params["tenant_id_1"]]
            items.sort(key=lambda item: item.created_at, reverse=True)
        elif entity in {AgentApproval, AgentArtifact} and "run_id_1" in params:
            items = [item for item in items if item.run_id == params["run_id_1"]]
            items.sort(key=lambda item: item.created_at)
        elif entity is Lesson and "course_id_1" in params:
            items = self._course_lessons(params["course_id_1"])

        return FakeResult(items)

    def add(self, item):
        self.added.append(item)
        if hasattr(item, "id"):
            self._objects[(type(item), item.id)] = item

    async def commit(self):
        self.commits += 1

    async def refresh(self, item):
        self.refreshed.append(item)

    async def flush(self):
        return None

    def _course_lessons(self, course_id):
        lessons = []
        for (model, _item_id), lesson in self._objects.items():
            if model is not Lesson or lesson.deleted_at:
                continue
            module = self._objects.get((Module, lesson.module_id))
            if module and module.course_id == course_id and not module.deleted_at:
                lessons.append(lesson)
        lessons.sort(key=lambda item: item.order_index)
        return lessons


def _user() -> User:
    return User(id=uuid.uuid4(), username="manager")


def _run(**overrides) -> AgentRun:
    values = {
        "id": uuid.uuid4(),
        "tenant_id": uuid.uuid4(),
        "created_by_user_id": uuid.uuid4(),
        "status": AgentRunStatus.draft_created,
        "approval_status": AgentApprovalStatus.pending,
        "input_json": {"tenant_id": str(uuid.uuid4()), "course_title": "Retry"},
        "created_at": datetime.utcnow(),
    }
    values.update(overrides)
    return AgentRun(**values)


def _approval(run: AgentRun, status=AgentApprovalStatus.pending) -> AgentApproval:
    return AgentApproval(
        run_id=run.id,
        tenant_id=run.tenant_id,
        requested_by_user_id=run.created_by_user_id,
        status=status,
    )


def _course_graph(run: AgentRun):
    course = Course(id=uuid.uuid4(), tenant_id=run.tenant_id, title="Draft", is_published=False)
    module = Module(id=uuid.uuid4(), course_id=course.id, title="Module")
    lesson = Lesson(id=uuid.uuid4(), module_id=module.id, title="Lesson", is_published=False)
    deleted_lesson = Lesson(
        id=uuid.uuid4(),
        module_id=module.id,
        title="Deleted",
        is_published=False,
        deleted_at=datetime.utcnow(),
    )
    artifact = AgentArtifact(
        run_id=run.id,
        tenant_id=run.tenant_id,
        artifact_type=AgentArtifactType.course,
        resource_type="course",
        resource_id=course.id,
        title=course.title,
    )
    return course, module, lesson, deleted_lesson, artifact


@pytest.mark.asyncio
async def test_agent_approve_and_reject_update_decision_state():
    run = _run()
    approval = _approval(run)
    session = FakeSession([run, approval])
    user = _user()

    approved = await decisions.approve_agent_run(
        session=session,
        run=run,
        current_user=user,
        request=AgentApprovalDecisionCreate(note="ok"),
    )

    assert approved.status == AgentRunStatus.approved
    assert approval.status == AgentApprovalStatus.approved
    assert approval.decided_by_user_id == user.id
    assert approval.response_json == {"note": "ok"}

    rejected = await decisions.reject_agent_run(
        session=session,
        run=run,
        current_user=user,
        request=AgentApprovalDecisionCreate(note="no"),
    )

    assert rejected.status == AgentRunStatus.rejected
    assert approval.status == AgentApprovalStatus.rejected
    assert approval.response_json == {"note": "no"}


@pytest.mark.asyncio
async def test_agent_publish_requires_approval_and_completed_structure_job(monkeypatch):
    run = _run()
    course, module, lesson, deleted_lesson, artifact = _course_graph(run)
    approval = _approval(run)
    job_artifact = AgentArtifact(
        run_id=run.id,
        tenant_id=run.tenant_id,
        artifact_type=AgentArtifactType.course_structure_generation_job,
        resource_type="course_structure_generation_job",
        resource_id=uuid.uuid4(),
    )
    job = CourseStructureGenerationJob(
        id=job_artifact.resource_id,
        tenant_id=run.tenant_id,
        course_id=course.id,
        created_by_user_id=run.created_by_user_id,
	        notebook_url="https://example.com/notebook/example",
        status=LessonGenerationJobStatus.queued,
    )
    session = FakeSession([run, approval, course, module, lesson, deleted_lesson, artifact, job_artifact, job])

    with pytest.raises(AgentRunOperationError):
        await decisions.publish_agent_run(
            session=session,
            run=run,
            current_user=_user(),
            request=AgentPublishCreate(),
        )
    assert course.is_published is False
    assert lesson.is_published is False

    run.approval_status = AgentApprovalStatus.approved
    with pytest.raises(AgentRunOperationError):
        await decisions.publish_agent_run(
            session=session,
            run=run,
            current_user=_user(),
            request=AgentPublishCreate(),
        )

    invalidations = []

    async def fake_invalidate_course_write_caches(**kwargs):
        invalidations.append(kwargs)

    monkeypatch.setattr(decisions, "invalidate_course_write_caches", fake_invalidate_course_write_caches)
    job.status = LessonGenerationJobStatus.drafts_created

    result = await decisions.publish_agent_run(
        session=session,
        run=run,
        current_user=_user(),
        request=AgentPublishCreate(),
    )

    assert result.run.status == AgentRunStatus.published
    assert course.is_published is True
    assert lesson.is_published is True
    assert deleted_lesson.is_published is False
    assert result.published_lessons_count == 1
    assert result.notification_deliveries_count == 0
    assert invalidations == [{"course_id": course.id, "tenant_id": run.tenant_id}]


@pytest.mark.asyncio
async def test_agent_publish_notifies_only_newly_published_lessons(monkeypatch):
    run = _run(approval_status=AgentApprovalStatus.approved)
    course, module, lesson, _deleted_lesson, artifact = _course_graph(run)
    already_published = Lesson(
        id=uuid.uuid4(),
        module_id=module.id,
        title="Already",
        is_published=True,
        order_index=2,
    )
    session = FakeSession([run, _approval(run, AgentApprovalStatus.approved), course, module, lesson, already_published, artifact])
    notified = []

    async def fake_invalidate_course_write_caches(**_kwargs):
        return None

    async def fake_notify_lesson_published(**kwargs):
        notified.append(kwargs["lesson"])
        return 3

    monkeypatch.setattr(decisions, "invalidate_course_write_caches", fake_invalidate_course_write_caches)
    monkeypatch.setattr(decisions, "notify_lesson_published", fake_notify_lesson_published)

    result = await decisions.publish_agent_run(
        session=session,
        run=run,
        current_user=_user(),
        request=AgentPublishCreate(notify_subscribers=True),
    )

    assert notified == [lesson]
    assert result.notification_deliveries_count == 3


@pytest.mark.asyncio
async def test_agent_retry_creates_fresh_run_from_original_input(monkeypatch):
    run = _run(status=AgentRunStatus.rejected, approval_status=AgentApprovalStatus.rejected)
    session = FakeSession([run])
    created = _run(status=AgentRunStatus.draft_created)

    async def fake_create_agent_run(**kwargs):
        assert kwargs["request"].course_title == "Retry"
        return created

    monkeypatch.setattr(decisions, "create_agent_run", fake_create_agent_run)

    assert await decisions.retry_agent_run(session=session, run=run, current_user=_user()) is created
    run.status = AgentRunStatus.draft_created
    with pytest.raises(AgentRunOperationError):
        await decisions.retry_agent_run(session=session, run=run, current_user=_user())


@pytest.mark.asyncio
async def test_list_agent_runs_is_tenant_scoped_and_newest_first():
    tenant_id = uuid.uuid4()
    older = _run(tenant_id=tenant_id, created_at=datetime.utcnow() - timedelta(days=1))
    newer = _run(tenant_id=tenant_id, created_at=datetime.utcnow())
    other = _run(tenant_id=uuid.uuid4(), created_at=datetime.utcnow() + timedelta(days=1))
    session = FakeSession([older, newer, other])

    runs = await list_agent_runs(session=session, tenant_id=tenant_id)

    assert [run.id for run in runs] == [newer.id, older.id]
