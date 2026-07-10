import json
from collections.abc import Awaitable, Callable
from dataclasses import asdict, dataclass
from time import monotonic
from typing import Literal


BenchmarkRole = Literal["planner", "writer", "reviewer"]
BenchmarkExecutor = Callable[[BenchmarkRole, str, str], Awaitable[str]]


@dataclass(frozen=True)
class BenchmarkStageFixture:
    role: BenchmarkRole
    prompt: str
    required_terms: tuple[str, ...] = ()
    required_json_keys: tuple[str, ...] = ()


@dataclass(frozen=True)
class CourseBenchmarkFixture:
    fixture_id: str
    stages: tuple[BenchmarkStageFixture, ...]


@dataclass(frozen=True)
class CourseModelBenchmarkConfig:
    name: str
    planner_model: str
    writer_model: str
    reviewer_model: str

    def model_for(self, role: BenchmarkRole) -> str:
        return getattr(self, f"{role}_model")


@dataclass(frozen=True)
class BenchmarkStageResult:
    role: BenchmarkRole
    model: str
    duration_ms: int
    score: int
    passed: bool
    error_type: str | None = None


@dataclass(frozen=True)
class BenchmarkFixtureResult:
    fixture_id: str
    score: int
    duration_ms: int
    stages: tuple[BenchmarkStageResult, ...]


@dataclass(frozen=True)
class BenchmarkConfigResult:
    config: CourseModelBenchmarkConfig
    score: int
    duration_ms: int
    fixtures: tuple[BenchmarkFixtureResult, ...]


@dataclass(frozen=True)
class CourseGenerationBenchmarkReport:
    results: tuple[BenchmarkConfigResult, ...]
    schema_version: int = 1

    def as_dict(self) -> dict[str, object]:
        return asdict(self)

    def to_json(self) -> str:
        return json.dumps(self.as_dict(), ensure_ascii=False, indent=2)


async def run_course_generation_benchmark(
    *,
    configs: tuple[CourseModelBenchmarkConfig, ...],
    fixtures: tuple[CourseBenchmarkFixture, ...],
    executor: BenchmarkExecutor,
) -> CourseGenerationBenchmarkReport:
    results = []
    for config in configs:
        fixture_results = [
            await _run_fixture(config=config, fixture=fixture, executor=executor)
            for fixture in fixtures
        ]
        results.append(
            BenchmarkConfigResult(
                config=config,
                score=_average(item.score for item in fixture_results),
                duration_ms=sum(item.duration_ms for item in fixture_results),
                fixtures=tuple(fixture_results),
            )
        )
    return CourseGenerationBenchmarkReport(results=tuple(results))


async def _run_fixture(
    *,
    config: CourseModelBenchmarkConfig,
    fixture: CourseBenchmarkFixture,
    executor: BenchmarkExecutor,
) -> BenchmarkFixtureResult:
    stage_results = []
    for stage in fixture.stages:
        stage_results.append(
            await _run_stage(config=config, fixture=stage, executor=executor)
        )
    return BenchmarkFixtureResult(
        fixture_id=fixture.fixture_id,
        score=_average(item.score for item in stage_results),
        duration_ms=sum(item.duration_ms for item in stage_results),
        stages=tuple(stage_results),
    )


async def _run_stage(
    *,
    config: CourseModelBenchmarkConfig,
    fixture: BenchmarkStageFixture,
    executor: BenchmarkExecutor,
) -> BenchmarkStageResult:
    model = config.model_for(fixture.role)
    started_at = monotonic()
    try:
        output = await executor(fixture.role, model, fixture.prompt)
        score = _score_output(output, fixture)
        return BenchmarkStageResult(
            role=fixture.role,
            model=model,
            duration_ms=_elapsed_ms(started_at),
            score=score,
            passed=score == 100,
        )
    except Exception as exc:
        return BenchmarkStageResult(
            role=fixture.role,
            model=model,
            duration_ms=_elapsed_ms(started_at),
            score=0,
            passed=False,
            error_type=type(exc).__name__,
        )


def _score_output(output: str, fixture: BenchmarkStageFixture) -> int:
    checks: list[bool] = []
    normalized = output.casefold()
    checks.extend(term.casefold() in normalized for term in fixture.required_terms)
    if fixture.required_json_keys:
        try:
            payload = json.loads(output)
        except (TypeError, ValueError):
            checks.extend(False for _ in fixture.required_json_keys)
        else:
            checks.extend(_has_json_key(payload, key) for key in fixture.required_json_keys)
    return 100 if not checks else round(100 * sum(checks) / len(checks))


def _has_json_key(payload: object, dotted_key: str) -> bool:
    current = payload
    for key in dotted_key.split("."):
        if not isinstance(current, dict) or key not in current:
            return False
        current = current[key]
    return True


def _average(values) -> int:
    items = list(values)
    return round(sum(items) / len(items)) if items else 0


def _elapsed_ms(started_at: float) -> int:
    return max(0, round((monotonic() - started_at) * 1000))
