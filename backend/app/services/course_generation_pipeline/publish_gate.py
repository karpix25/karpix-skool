from datetime import datetime
from typing import Iterable

from ...models_course_generation_pipeline import (
    CourseGenerationArtifactStatus,
    CourseGenerationArtifactType,
    CourseGenerationRunStatus,
)
from ...schemas.course_generation_pipeline import (
    CourseBlueprintPayload,
    PublishChecklist,
    PublishChecklistItem,
)
from .state_machine import transition_run


class CourseGenerationPublishGateError(ValueError):
    pass


REVIEWABLE_RUN_STATUSES = frozenset(
    {
        CourseGenerationRunStatus.waiting_for_review,
        CourseGenerationRunStatus.ready_to_publish,
    }
)


def build_publish_checklist(
    *,
    run,
    artifacts: Iterable,
    blueprint: CourseBlueprintPayload | dict | None = None,
) -> PublishChecklist:
    artifact_list = list(artifacts)
    blueprint_payload = _coerce_blueprint(blueprint) or _blueprint_from_artifacts(artifact_list)
    expected_lessons = _expected_lesson_count(blueprint_payload)
    lesson_artifacts = _artifacts_by_type(artifact_list, CourseGenerationArtifactType.lesson_draft)
    approved_lessons = _artifacts_with_status(lesson_artifacts, CourseGenerationArtifactStatus.approved)
    blocking_statuses = {CourseGenerationArtifactStatus.failed, CourseGenerationArtifactStatus.rejected}
    blocking_artifacts = [artifact for artifact in artifact_list if _artifact_status(artifact) in blocking_statuses]

    items = [
        _item(
            "course_bound",
            "Course draft exists",
            bool(getattr(run, "course_id", None)),
            "Pipeline run must be connected to a course draft before publish.",
        ),
        _item(
            "run_reviewable",
            "Run is in review state",
            CourseGenerationRunStatus(getattr(run, "status")) in REVIEWABLE_RUN_STATUSES,
            "Only reviewed generation runs can be promoted to publish.",
        ),
        _item(
            "blueprint_approved",
            "Course blueprint approved",
            _has_approved_artifact(artifact_list, CourseGenerationArtifactType.blueprint),
            "Admin approval is required for the generated course blueprint.",
        ),
        _item(
            "lesson_drafts_approved",
            "Lesson drafts approved",
            _lesson_approval_passed(expected_lessons, approved_lessons, lesson_artifacts),
            _lesson_approval_detail(expected_lessons, approved_lessons, lesson_artifacts),
        ),
        _item(
            "required_media_ready",
            "Required media ready",
            _required_media_ready(artifact_list),
            "Required media artifacts must be approved and include a URL.",
        ),
        _item(
            "no_rejected_artifacts",
            "No rejected or failed artifacts",
            not blocking_artifacts,
            f"{len(blocking_artifacts)} artifact(s) need review or regeneration.",
        ),
    ]
    return PublishChecklist(can_publish=all(item.passed for item in items if item.blocking), items=items)


def ensure_publish_ready(checklist: PublishChecklist) -> None:
    if checklist.can_publish:
        return

    failed = [item.label for item in checklist.items if item.blocking and not item.passed]
    raise CourseGenerationPublishGateError("Publish gate failed: " + ", ".join(failed))


def mark_run_ready_if_publishable(
    *,
    run,
    artifacts: Iterable,
    blueprint: CourseBlueprintPayload | dict | None = None,
    now: datetime | None = None,
) -> PublishChecklist:
    checklist = build_publish_checklist(run=run, artifacts=artifacts, blueprint=blueprint)
    if checklist.can_publish:
        transition_run(run, CourseGenerationRunStatus.ready_to_publish, now=now)
    return checklist


def _item(key: str, label: str, passed: bool, detail: str) -> PublishChecklistItem:
    return PublishChecklistItem(key=key, label=label, passed=passed, detail=None if passed else detail)


def _coerce_blueprint(blueprint: CourseBlueprintPayload | dict | None) -> CourseBlueprintPayload | None:
    if blueprint is None:
        return None
    if isinstance(blueprint, CourseBlueprintPayload):
        return blueprint
    return CourseBlueprintPayload.model_validate(blueprint)


def _blueprint_from_artifacts(artifacts: list) -> CourseBlueprintPayload | None:
    for artifact in artifacts:
        if _artifact_type(artifact) != CourseGenerationArtifactType.blueprint:
            continue
        payload = getattr(artifact, "payload_json", None)
        if payload:
            return CourseBlueprintPayload.model_validate(payload)
    return None


def _expected_lesson_count(blueprint: CourseBlueprintPayload | None) -> int:
    if blueprint is None:
        return 0
    return sum(len(module.lessons) for module in blueprint.modules)


def _lesson_approval_passed(expected: int, approved: list, lesson_artifacts: list) -> bool:
    if expected > 0:
        return len(approved) >= expected
    return bool(lesson_artifacts) and len(approved) == len(lesson_artifacts)


def _lesson_approval_detail(expected: int, approved: list, lesson_artifacts: list) -> str:
    if expected > 0:
        return f"{len(approved)} of {expected} expected lesson draft(s) approved."
    return f"{len(approved)} of {len(lesson_artifacts)} lesson draft artifact(s) approved."


def _required_media_ready(artifacts: list) -> bool:
    for artifact in _artifacts_by_type(artifacts, CourseGenerationArtifactType.media_asset):
        payload = getattr(artifact, "payload_json", None) or {}
        if not payload.get("required"):
            continue
        if _artifact_status(artifact) != CourseGenerationArtifactStatus.approved:
            return False
        if not payload.get("url"):
            return False
    return True


def _has_approved_artifact(artifacts: list, artifact_type: CourseGenerationArtifactType) -> bool:
    return any(
        _artifact_type(artifact) == artifact_type
        and _artifact_status(artifact) == CourseGenerationArtifactStatus.approved
        for artifact in artifacts
    )


def _artifacts_by_type(artifacts: list, artifact_type: CourseGenerationArtifactType) -> list:
    return [artifact for artifact in artifacts if _artifact_type(artifact) == artifact_type]


def _artifacts_with_status(artifacts: list, status: CourseGenerationArtifactStatus) -> list:
    return [artifact for artifact in artifacts if _artifact_status(artifact) == status]


def _artifact_type(artifact) -> CourseGenerationArtifactType:
    return CourseGenerationArtifactType(getattr(artifact, "artifact_type"))


def _artifact_status(artifact) -> CourseGenerationArtifactStatus:
    return CourseGenerationArtifactStatus(getattr(artifact, "status"))
