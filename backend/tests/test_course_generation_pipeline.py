from datetime import datetime
import uuid

import pytest
from pydantic import ValidationError

from app.models_course_generation_pipeline import (
    CourseGenerationArtifact,
    CourseGenerationArtifactStatus,
    CourseGenerationArtifactType,
    CourseGenerationRun,
    CourseGenerationRunStatus,
    CourseGenerationStage,
)
from app.schemas.course_generation_pipeline import CourseBlueprintPayload, MediaAssetPayload
from app.services.course_generation_pipeline.publish_gate import (
    CourseGenerationPublishGateError,
    build_publish_checklist,
    ensure_publish_ready,
    mark_run_ready_if_publishable,
)
from app.services.course_generation_pipeline.state_machine import (
    CourseGenerationStateError,
    advance_run_stage,
    next_stage,
    transition_run,
)


def test_blueprint_payload_normalizes_nested_text():
    blueprint = CourseBlueprintPayload.model_validate(
        {
            "title": "  Growth Course  ",
            "learning_outcomes": [" Outcome one ", ""],
            "modules": [
                {
                    "title": "  Basics  ",
                    "lessons": [
                        {
                            "title": "  First lesson  ",
                            "learning_objectives": [" Learn it ", " "],
                        }
                    ],
                }
            ],
        }
    )

    assert blueprint.title == "Growth Course"
    assert blueprint.learning_outcomes == ["Outcome one"]
    assert blueprint.modules[0].title == "Basics"
    assert blueprint.modules[0].lessons[0].learning_objectives == ["Learn it"]


def test_media_payload_rejects_non_http_url():
    with pytest.raises(ValidationError):
        MediaAssetPayload.model_validate({"kind": "image", "url": "ftp://example.com/file.png"})


def test_run_state_machine_tracks_dates_and_rejects_invalid_transitions():
    run = _run()
    started_at = datetime(2026, 7, 8, 10, 0, 0)

    transition_run(run, CourseGenerationRunStatus.running, now=started_at)
    advance_run_stage(run, CourseGenerationStage.lesson_drafts, now=started_at)

    assert run.status == CourseGenerationRunStatus.running
    assert run.started_at == started_at
    assert run.current_stage == CourseGenerationStage.lesson_drafts
    assert next_stage(CourseGenerationStage.lesson_drafts) == CourseGenerationStage.media_assets

    with pytest.raises(CourseGenerationStateError):
        transition_run(run, CourseGenerationRunStatus.published)

    with pytest.raises(CourseGenerationStateError):
        advance_run_stage(run, CourseGenerationStage.blueprint)


def test_publish_checklist_blocks_until_blueprint_and_lessons_are_approved():
    run = _run(status=CourseGenerationRunStatus.waiting_for_review, course_id=uuid.uuid4())
    blueprint = _blueprint()
    artifacts = [
        _artifact(run, CourseGenerationArtifactType.blueprint, CourseGenerationArtifactStatus.approved),
        _artifact(run, CourseGenerationArtifactType.lesson_draft, CourseGenerationArtifactStatus.approved),
        _artifact(run, CourseGenerationArtifactType.lesson_draft, CourseGenerationArtifactStatus.generated),
    ]

    checklist = build_publish_checklist(run=run, artifacts=artifacts, blueprint=blueprint)

    assert checklist.can_publish is False
    assert _checklist_item(checklist, "lesson_drafts_approved").passed is False
    with pytest.raises(CourseGenerationPublishGateError):
        ensure_publish_ready(checklist)


def test_publish_gate_marks_run_ready_when_all_blocking_checks_pass():
    run = _run(status=CourseGenerationRunStatus.waiting_for_review, course_id=uuid.uuid4())
    blueprint = _blueprint()
    artifacts = [
        _artifact(run, CourseGenerationArtifactType.blueprint, CourseGenerationArtifactStatus.approved),
        _artifact(run, CourseGenerationArtifactType.lesson_draft, CourseGenerationArtifactStatus.approved),
        _artifact(run, CourseGenerationArtifactType.lesson_draft, CourseGenerationArtifactStatus.approved),
        _artifact(
            run,
            CourseGenerationArtifactType.media_asset,
            CourseGenerationArtifactStatus.approved,
            payload={"required": True, "url": "https://cdn.example.com/cover.png"},
        ),
    ]
    ready_at = datetime(2026, 7, 8, 11, 0, 0)

    checklist = mark_run_ready_if_publishable(run=run, artifacts=artifacts, blueprint=blueprint, now=ready_at)

    assert checklist.can_publish is True
    assert run.status == CourseGenerationRunStatus.ready_to_publish
    assert run.updated_at == ready_at


def test_publish_gate_blocks_required_media_without_url():
    run = _run(status=CourseGenerationRunStatus.waiting_for_review, course_id=uuid.uuid4())
    artifacts = [
        _artifact(run, CourseGenerationArtifactType.blueprint, CourseGenerationArtifactStatus.approved),
        _artifact(run, CourseGenerationArtifactType.lesson_draft, CourseGenerationArtifactStatus.approved),
        _artifact(
            run,
            CourseGenerationArtifactType.media_asset,
            CourseGenerationArtifactStatus.approved,
            payload={"required": True},
        ),
    ]

    checklist = build_publish_checklist(run=run, artifacts=artifacts, blueprint=_one_lesson_blueprint())

    assert checklist.can_publish is False
    assert _checklist_item(checklist, "required_media_ready").passed is False


def _run(
    *,
    status: CourseGenerationRunStatus = CourseGenerationRunStatus.queued,
    course_id: uuid.UUID | None = None,
) -> CourseGenerationRun:
    return CourseGenerationRun(
        tenant_id=uuid.uuid4(),
        course_id=course_id,
        created_by_user_id=uuid.uuid4(),
        status=status,
    )


def _artifact(
    run: CourseGenerationRun,
    artifact_type: CourseGenerationArtifactType,
    status: CourseGenerationArtifactStatus,
    *,
    payload: dict | None = None,
) -> CourseGenerationArtifact:
    return CourseGenerationArtifact(
        run_id=run.id,
        tenant_id=run.tenant_id,
        artifact_type=artifact_type,
        status=status,
        stage=CourseGenerationStage.review,
        payload_json=payload,
    )


def _blueprint() -> CourseBlueprintPayload:
    return CourseBlueprintPayload.model_validate(
        {
            "title": "Growth Course",
            "modules": [
                {
                    "title": "Basics",
                    "lessons": [{"title": "One"}, {"title": "Two"}],
                }
            ],
        }
    )


def _one_lesson_blueprint() -> CourseBlueprintPayload:
    return CourseBlueprintPayload.model_validate(
        {
            "title": "Growth Course",
            "modules": [{"title": "Basics", "lessons": [{"title": "One"}]}],
        }
    )


def _checklist_item(checklist, key: str):
    return next(item for item in checklist.items if item.key == key)
