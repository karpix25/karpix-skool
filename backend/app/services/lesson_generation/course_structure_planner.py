from dataclasses import dataclass
from typing import Any

from ...models_generation import CourseStructureGenerationJob
from .course_structure_stage_payloads import (
    CourseBlueprintPayload,
    ProductCourseStrategyPayload,
    parse_course_blueprint,
    parse_product_course_strategy,
)
from .course_structure_stage_prompts import (
    build_course_blueprint_from_brief_prompt,
    build_product_course_strategy_prompt,
)
from .parser import LessonGenerationParseError
from .structure_text_generator import StructureTextGenerator


MAX_PLANNER_ATTEMPTS = 2


@dataclass(frozen=True)
class CoursePlanningResult:
    strategy: ProductCourseStrategyPayload
    blueprint: CourseBlueprintPayload
    audit: dict[str, Any]


class CoursePlanningError(LessonGenerationParseError):
    def __init__(self, message: str, *, stage: str, audit: dict[str, Any]):
        super().__init__(message)
        self.stage = stage
        self.audit = audit


class CourseStructurePlanner:
    """Generate strategy and blueprint without owning job persistence."""

    def __init__(
        self,
        *,
        text_generator: StructureTextGenerator | None = None,
        attempts: int = MAX_PLANNER_ATTEMPTS,
    ) -> None:
        self.text_generator = text_generator or StructureTextGenerator(role="planner")
        self.attempts = max(1, attempts)

    async def plan(
        self,
        *,
        source_brief: str,
        job: CourseStructureGenerationJob,
        course_title: str,
    ) -> CoursePlanningResult:
        strategy, strategy_audit = await self._generate_strategy(
            source_brief=source_brief,
            job=job,
            course_title=course_title,
        )
        blueprint, blueprint_audit = await self._generate_blueprint(
            source_brief=source_brief,
            job=job,
            course_title=course_title,
            strategy=strategy,
        )
        return CoursePlanningResult(
            strategy=strategy,
            blueprint=blueprint,
            audit={
                "provider": self.text_generator.provider_name,
                "model": self.text_generator.resolved_model_name,
                "strategy_generation": strategy_audit,
                "blueprint_generation": blueprint_audit,
            },
        )

    async def _generate_strategy(
        self,
        *,
        source_brief: str,
        job: CourseStructureGenerationJob,
        course_title: str,
    ) -> tuple[ProductCourseStrategyPayload, dict[str, Any]]:
        async def generate(previous_error: str | None, previous_answer: str | None) -> str:
            return await self.text_generator.generate_text(
                build_product_course_strategy_prompt(
                    job=job,
                    course_title=course_title,
                    source_brief=source_brief,
                    previous_error=previous_error,
                    previous_answer=previous_answer,
                )
            )

        return await self._run_stage("product_strategy", generate, parse_product_course_strategy)

    async def _generate_blueprint(
        self,
        *,
        source_brief: str,
        job: CourseStructureGenerationJob,
        course_title: str,
        strategy: ProductCourseStrategyPayload,
    ) -> tuple[CourseBlueprintPayload, dict[str, Any]]:
        async def generate(previous_error: str | None, previous_answer: str | None) -> str:
            return await self.text_generator.generate_text(
                build_course_blueprint_from_brief_prompt(
                    job=job,
                    course_title=course_title,
                    source_brief=source_brief,
                    product_strategy=strategy,
                    previous_error=previous_error,
                    previous_answer=previous_answer,
                )
            )

        def parse(answer: str) -> CourseBlueprintPayload:
            return parse_course_blueprint(
                answer,
                max_modules=job.module_count,
                max_lessons_per_module=job.lessons_per_module,
            )

        return await self._run_stage("blueprint", generate, parse)

    async def _run_stage(self, stage: str, generate, parse):
        previous_answer: str | None = None
        previous_error: str | None = None
        failures: list[dict[str, Any]] = []
        for attempt in range(1, self.attempts + 1):
            answer = await generate(previous_error, previous_answer)
            previous_answer = answer
            try:
                payload = parse(answer)
                return payload, self._success_audit(answer, attempt, failures)
            except LessonGenerationParseError as exc:
                previous_error = str(exc)
                failures.append({"attempt": attempt, "error": previous_error, "answer": answer})
        message = f"Failed to generate valid {stage} after {len(failures)} attempts: {previous_error}"
        raise CoursePlanningError(
            message,
            stage=stage,
            audit={"attempt_errors": failures, **self._model_audit()},
        )

    def _success_audit(
        self,
        answer: str,
        attempt: int,
        failures: list[dict[str, Any]],
    ) -> dict[str, Any]:
        return {
            **self._model_audit(),
            "answer": answer,
            "attempts": attempt,
            "attempt_errors": failures,
        }

    def _model_audit(self) -> dict[str, str]:
        return {
            "provider": self.text_generator.provider_name,
            "model": self.text_generator.resolved_model_name,
        }
