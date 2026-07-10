import json
import logging
from collections.abc import Callable, Mapping
from contextlib import asynccontextmanager
from dataclasses import asdict, dataclass
from time import monotonic
from typing import AsyncIterator, Literal


StageStatus = Literal["started", "succeeded", "failed"]
MetricSink = Callable[[Mapping[str, object]], None]

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class CourseGenerationStageMetric:
    stage: str
    status: StageStatus
    duration_ms: int | None = None
    job_id: str | None = None
    course_id: str | None = None
    tenant_id: str | None = None
    role: str | None = None
    provider: str | None = None
    model: str | None = None
    attempt: int | None = None
    error_type: str | None = None

    def as_event(self) -> dict[str, object]:
        event = {
            "event": "course_generation_stage",
            **asdict(self),
        }
        return {key: value for key, value in event.items() if value is not None}


class CourseGenerationObserver:
    """Emits allow-listed generation metadata without prompts, output, or keys."""

    def __init__(self, sink: MetricSink | None = None):
        self._sink = sink or _log_metric

    def emit(self, metric: CourseGenerationStageMetric) -> None:
        self._sink(metric.as_event())

    @asynccontextmanager
    async def stage(
        self,
        *,
        stage: str,
        job_id: str | None = None,
        course_id: str | None = None,
        tenant_id: str | None = None,
        role: str | None = None,
        provider: str | None = None,
        model: str | None = None,
        attempt: int | None = None,
    ) -> AsyncIterator[None]:
        base = {
            "stage": stage,
            "job_id": job_id,
            "course_id": course_id,
            "tenant_id": tenant_id,
            "role": role,
            "provider": provider,
            "model": model,
            "attempt": attempt,
        }
        self.emit(CourseGenerationStageMetric(status="started", **base))
        started_at = monotonic()
        try:
            yield
        except Exception as exc:
            self.emit(
                CourseGenerationStageMetric(
                    status="failed",
                    duration_ms=_elapsed_ms(started_at),
                    error_type=type(exc).__name__,
                    **base,
                )
            )
            raise
        self.emit(
            CourseGenerationStageMetric(
                status="succeeded",
                duration_ms=_elapsed_ms(started_at),
                **base,
            )
        )


def _elapsed_ms(started_at: float) -> int:
    return max(0, round((monotonic() - started_at) * 1000))


def _log_metric(event: Mapping[str, object]) -> None:
    logger.info(json.dumps(dict(event), ensure_ascii=False, sort_keys=True))
