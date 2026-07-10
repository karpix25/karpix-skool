import pytest

from app.services.lesson_generation.course_generation_observability import (
    CourseGenerationObserver,
    CourseGenerationStageMetric,
)


def test_metric_event_contains_only_allow_listed_metadata():
    event = CourseGenerationStageMetric(
        stage="writer",
        status="succeeded",
        duration_ms=12,
        job_id="job-1",
        provider="openrouter",
        model="google/gemini-2.5-flash",
    ).as_event()

    assert event == {
        "event": "course_generation_stage",
        "stage": "writer",
        "status": "succeeded",
        "duration_ms": 12,
        "job_id": "job-1",
        "provider": "openrouter",
        "model": "google/gemini-2.5-flash",
    }
    assert "prompt" not in event
    assert "api_key" not in event


@pytest.mark.asyncio
async def test_stage_emits_started_and_succeeded_events():
    events = []
    observer = CourseGenerationObserver(events.append)

    async with observer.stage(stage="planner", role="planner", attempt=1):
        pass

    assert [event["status"] for event in events] == ["started", "succeeded"]
    assert events[1]["duration_ms"] >= 0


@pytest.mark.asyncio
async def test_stage_records_only_exception_type_then_reraises():
    events = []
    observer = CourseGenerationObserver(events.append)

    with pytest.raises(RuntimeError, match="secret-value"):
        async with observer.stage(stage="reviewer"):
            raise RuntimeError("secret-value")

    assert events[-1]["status"] == "failed"
    assert events[-1]["error_type"] == "RuntimeError"
    assert "secret-value" not in str(events[-1])
