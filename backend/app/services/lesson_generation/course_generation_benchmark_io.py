import json
from pathlib import Path

from .course_generation_benchmark import (
    BenchmarkStageFixture,
    CourseBenchmarkFixture,
    CourseModelBenchmarkConfig,
)


def load_benchmark_fixtures(path: Path) -> tuple[CourseBenchmarkFixture, ...]:
    payload = _load_list(path)
    return tuple(
        CourseBenchmarkFixture(
            fixture_id=_required_string(item, "fixture_id"),
            stages=tuple(_load_stage(stage) for stage in _required_list(item, "stages")),
        )
        for item in payload
    )


def load_benchmark_configs(path: Path) -> tuple[CourseModelBenchmarkConfig, ...]:
    payload = _load_list(path)
    return tuple(
        CourseModelBenchmarkConfig(
            name=_required_string(item, "name"),
            planner_model=_required_string(item, "planner_model"),
            writer_model=_required_string(item, "writer_model"),
            reviewer_model=_required_string(item, "reviewer_model"),
        )
        for item in payload
    )


def _load_stage(payload: object) -> BenchmarkStageFixture:
    item = _required_object(payload)
    role = _required_string(item, "role")
    if role not in {"planner", "writer", "reviewer"}:
        raise ValueError(f"Unsupported benchmark role: {role}")
    return BenchmarkStageFixture(
        role=role,
        prompt=_required_string(item, "prompt"),
        required_terms=_optional_strings(item, "required_terms"),
        required_json_keys=_optional_strings(item, "required_json_keys"),
    )


def _load_list(path: Path) -> list[object]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(payload, list) or not payload:
        raise ValueError(f"Benchmark file must contain a non-empty JSON list: {path}")
    return payload


def _required_object(payload: object) -> dict[str, object]:
    if not isinstance(payload, dict):
        raise ValueError("Benchmark entries must be JSON objects")
    return payload


def _required_list(payload: object, key: str) -> list[object]:
    item = _required_object(payload).get(key)
    if not isinstance(item, list) or not item:
        raise ValueError(f'Benchmark field "{key}" must be a non-empty list')
    return item


def _required_string(payload: object, key: str) -> str:
    value = _required_object(payload).get(key)
    if not isinstance(value, str) or not value.strip():
        raise ValueError(f'Benchmark field "{key}" must be a non-empty string')
    return value.strip()


def _optional_strings(payload: object, key: str) -> tuple[str, ...]:
    value = _required_object(payload).get(key, [])
    if not isinstance(value, list) or not all(isinstance(item, str) for item in value):
        raise ValueError(f'Benchmark field "{key}" must be a list of strings')
    return tuple(item.strip() for item in value if item.strip())
