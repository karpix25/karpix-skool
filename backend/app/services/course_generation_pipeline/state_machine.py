from datetime import datetime

from ...models_course_generation_pipeline import CourseGenerationRunStatus, CourseGenerationStage


class CourseGenerationStateError(ValueError):
    pass


TERMINAL_RUN_STATUSES = frozenset(
    {
        CourseGenerationRunStatus.published,
        CourseGenerationRunStatus.failed,
        CourseGenerationRunStatus.cancelled,
    }
)

STAGE_SEQUENCE = (
    CourseGenerationStage.intake,
    CourseGenerationStage.blueprint,
    CourseGenerationStage.lesson_drafts,
    CourseGenerationStage.media_assets,
    CourseGenerationStage.review,
    CourseGenerationStage.publish,
)

_ALLOWED_RUN_TRANSITIONS: dict[CourseGenerationRunStatus, frozenset[CourseGenerationRunStatus]] = {
    CourseGenerationRunStatus.queued: frozenset(
        {
            CourseGenerationRunStatus.running,
            CourseGenerationRunStatus.cancelled,
            CourseGenerationRunStatus.failed,
        }
    ),
    CourseGenerationRunStatus.running: frozenset(
        {
            CourseGenerationRunStatus.waiting_for_review,
            CourseGenerationRunStatus.failed,
            CourseGenerationRunStatus.cancelled,
        }
    ),
    CourseGenerationRunStatus.waiting_for_review: frozenset(
        {
            CourseGenerationRunStatus.running,
            CourseGenerationRunStatus.ready_to_publish,
            CourseGenerationRunStatus.failed,
            CourseGenerationRunStatus.cancelled,
        }
    ),
    CourseGenerationRunStatus.ready_to_publish: frozenset(
        {
            CourseGenerationRunStatus.running,
            CourseGenerationRunStatus.publishing,
            CourseGenerationRunStatus.failed,
            CourseGenerationRunStatus.cancelled,
        }
    ),
    CourseGenerationRunStatus.publishing: frozenset(
        {
            CourseGenerationRunStatus.published,
            CourseGenerationRunStatus.failed,
        }
    ),
    CourseGenerationRunStatus.published: frozenset(),
    CourseGenerationRunStatus.failed: frozenset({CourseGenerationRunStatus.queued}),
    CourseGenerationRunStatus.cancelled: frozenset(),
}


def can_transition_run(
    current: CourseGenerationRunStatus | str,
    target: CourseGenerationRunStatus | str,
) -> bool:
    current_status = CourseGenerationRunStatus(current)
    target_status = CourseGenerationRunStatus(target)
    return target_status == current_status or target_status in _ALLOWED_RUN_TRANSITIONS[current_status]


def transition_run(
    run,
    target: CourseGenerationRunStatus | str,
    *,
    now: datetime | None = None,
    error: str | None = None,
):
    current_status = CourseGenerationRunStatus(run.status)
    target_status = CourseGenerationRunStatus(target)
    if not can_transition_run(current_status, target_status):
        raise CourseGenerationStateError(f"Cannot transition run from {current_status.value} to {target_status.value}")

    timestamp = now or datetime.utcnow()
    run.status = target_status
    run.updated_at = timestamp

    if target_status == CourseGenerationRunStatus.running and not getattr(run, "started_at", None):
        run.started_at = timestamp
    if target_status in TERMINAL_RUN_STATUSES:
        run.completed_at = timestamp
    if error is not None:
        run.error = error[:2000]
    elif target_status != CourseGenerationRunStatus.failed and target_status != current_status:
        run.error = None
    return run


def can_advance_stage(
    current: CourseGenerationStage | str,
    target: CourseGenerationStage | str,
) -> bool:
    current_stage = CourseGenerationStage(current)
    target_stage = CourseGenerationStage(target)
    return STAGE_SEQUENCE.index(target_stage) >= STAGE_SEQUENCE.index(current_stage)


def advance_run_stage(
    run,
    target: CourseGenerationStage | str,
    *,
    now: datetime | None = None,
):
    current_stage = CourseGenerationStage(run.current_stage)
    target_stage = CourseGenerationStage(target)
    if not can_advance_stage(current_stage, target_stage):
        raise CourseGenerationStateError(f"Cannot move stage from {current_stage.value} back to {target_stage.value}")

    if current_stage != target_stage:
        run.current_stage = target_stage
        run.updated_at = now or datetime.utcnow()
    return run


def next_stage(stage: CourseGenerationStage | str) -> CourseGenerationStage | None:
    current_stage = CourseGenerationStage(stage)
    index = STAGE_SEQUENCE.index(current_stage)
    if index == len(STAGE_SEQUENCE) - 1:
        return None
    return STAGE_SEQUENCE[index + 1]
