from dataclasses import dataclass
from typing import Any

from ...models_generation import CourseStructureGenerationJob
from .course_source_map import CourseSourceMapPayload, parse_course_source_map
from .course_source_map_prompts import build_course_source_map_prompt
from .parser import LessonGenerationParseError
from .structure_text_generator import StructureTextGenerator


@dataclass(frozen=True)
class CourseSourceMapResult:
    source_map: CourseSourceMapPayload
    audit: dict[str, Any]


class CourseSourceMapError(LessonGenerationParseError):
    def __init__(self, message: str, *, audit: dict[str, Any]):
        super().__init__(message)
        self.audit = audit


class CourseSourceMapService:
    def __init__(
        self,
        *,
        text_generator: StructureTextGenerator | None = None,
        attempts: int = 2,
    ) -> None:
        self.text_generator = text_generator or StructureTextGenerator(role="planner")
        self.attempts = max(1, attempts)

    async def generate(
        self,
        *,
        source_brief: str,
        job: CourseStructureGenerationJob,
        course_title: str,
    ) -> CourseSourceMapResult:
        failures: list[dict[str, str | int]] = []
        prompt = build_course_source_map_prompt(
            course_title=course_title,
            source_brief=source_brief,
            requested_modules=job.module_count,
            requested_lessons_per_module=job.lessons_per_module,
        )
        for attempt in range(1, self.attempts + 1):
            answer = await self.text_generator.generate_text(prompt)
            try:
                source_map = parse_course_source_map(answer)
                if not source_map.can_generate_course:
                    raise CourseSourceMapError(
                        "Sources are insufficient for a grounded course",
                        audit={"source_map": source_map.model_dump(mode="json")},
                    )
                return CourseSourceMapResult(
                    source_map=source_map,
                    audit={
                        **self.text_generator.model_metadata(),
                        "answer": answer,
                        "attempts": attempt,
                        "attempt_errors": failures,
                    },
                )
            except CourseSourceMapError:
                raise
            except LessonGenerationParseError as exc:
                failures.append({"attempt": attempt, "error": str(exc), "answer": answer})
        raise CourseSourceMapError(
            "Failed to generate a valid source sufficiency map",
            audit={**self.text_generator.model_metadata(), "attempt_errors": failures},
        )


def source_map_planning_brief(source_brief: str, source_map: CourseSourceMapPayload) -> str:
    return (
        f"{source_brief}\n\n"
        "Проверенная карта достаточности источника. Не выходи за ее границы:\n"
        f"{source_map.model_dump_json(indent=2)}"
    )
