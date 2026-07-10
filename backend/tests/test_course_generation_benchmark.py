import json

import pytest

from app.services.lesson_generation.course_generation_benchmark import (
    BenchmarkStageFixture,
    CourseBenchmarkFixture,
    CourseModelBenchmarkConfig,
    run_course_generation_benchmark,
)


@pytest.mark.asyncio
async def test_benchmark_compares_role_specific_models_and_scores_checks():
    calls = []

    async def executor(role, model, prompt):
        calls.append((role, model, prompt))
        if role == "planner":
            return '{"modules": []}'
        return '{"title": "Artifact lesson", "content": "Evidence and artifact"}'

    fixture = CourseBenchmarkFixture(
        fixture_id="fixture-1",
        stages=(
            BenchmarkStageFixture(
                role="planner",
                prompt="plan",
                required_json_keys=("modules",),
            ),
            BenchmarkStageFixture(
                role="writer",
                prompt="write",
                required_terms=("artifact", "evidence"),
                required_json_keys=("title", "content"),
            ),
        ),
    )
    config = CourseModelBenchmarkConfig(
        name="mixed",
        planner_model="planner-model",
        writer_model="writer-model",
        reviewer_model="reviewer-model",
    )

    report = await run_course_generation_benchmark(
        configs=(config,), fixtures=(fixture,), executor=executor
    )

    assert calls == [
        ("planner", "planner-model", "plan"),
        ("writer", "writer-model", "write"),
    ]
    assert report.results[0].score == 100
    assert all(stage.passed for stage in report.results[0].fixtures[0].stages)
    assert json.loads(report.to_json())["schema_version"] == 1


@pytest.mark.asyncio
async def test_benchmark_isolates_executor_failure_in_report():
    async def executor(role, model, prompt):
        raise TimeoutError("provider response included private output")

    fixture = CourseBenchmarkFixture(
        fixture_id="timeout",
        stages=(BenchmarkStageFixture(role="reviewer", prompt="review"),),
    )
    config = CourseModelBenchmarkConfig("one", "p", "w", "r")

    report = await run_course_generation_benchmark(
        configs=(config,), fixtures=(fixture,), executor=executor
    )

    stage = report.results[0].fixtures[0].stages[0]
    assert stage.score == 0
    assert stage.error_type == "TimeoutError"
    assert "private output" not in report.to_json()


@pytest.mark.asyncio
async def test_benchmark_awards_partial_score_for_missing_checks():
    async def executor(role, model, prompt):
        return '{"title": "Artifact"}'

    fixture = CourseBenchmarkFixture(
        fixture_id="partial",
        stages=(
            BenchmarkStageFixture(
                role="writer",
                prompt="write",
                required_terms=("artifact",),
                required_json_keys=("title", "content"),
            ),
        ),
    )
    config = CourseModelBenchmarkConfig("one", "p", "w", "r")

    report = await run_course_generation_benchmark(
        configs=(config,), fixtures=(fixture,), executor=executor
    )

    assert report.results[0].score == 67
    assert report.results[0].fixtures[0].stages[0].passed is False
