from dataclasses import dataclass
from typing import Optional

from ...models_generation import CourseStructureGenerationJob
from ...schemas.lesson_generation import GeneratedCourseStructurePayload
from .course_structure_quality import validate_generated_course_structure
from .parser import LessonGenerationParseError, parse_generated_course_structure
from .prompts import build_course_structure_from_brief_prompt
from .structure_text_generator import DEFAULT_GOOGLE_MODEL, StructureTextGenerator


DEFAULT_STRUCTURE_MODEL = DEFAULT_GOOGLE_MODEL
MAX_STRUCTURE_ATTEMPTS = 2


@dataclass(frozen=True)
class CourseStructureResult:
    generated: GeneratedCourseStructurePayload
    response_json: dict


class CourseStructureParseRetryError(LessonGenerationParseError):
    def __init__(self, message: str, *, response_json: Optional[dict] = None):
        super().__init__(message)
        self.response_json = response_json


class CourseStructureGenerator:
    def __init__(
        self,
        *,
        model_name: Optional[str] = None,
        attempts: int = MAX_STRUCTURE_ATTEMPTS,
        text_generator: Optional[StructureTextGenerator] = None,
    ):
        self.text_generator = text_generator or StructureTextGenerator(model_name=model_name)
        self.attempts = max(1, attempts)

    async def generate(
        self,
        *,
        source_brief: str,
        job: CourseStructureGenerationJob,
        course_title: str,
    ) -> CourseStructureResult:
        last_answer = None
        last_error = None
        attempts_json = []

        for attempt in range(1, self.attempts + 1):
            prompt = build_course_structure_from_brief_prompt(
                job=job,
                course_title=course_title,
                source_brief=source_brief,
                previous_error=last_error,
                previous_answer=last_answer,
            )
            answer = await self._generate_text(prompt)
            last_answer = answer
            try:
                generated = parse_generated_course_structure(
                    answer,
                    max_modules=job.module_count,
                    max_lessons_per_module=job.lessons_per_module,
                )
                validate_generated_course_structure(generated=generated, job=job)
                return CourseStructureResult(
                    generated=generated,
                    response_json={
                        "provider": self.text_generator.provider_name,
                        "model": self.text_generator.resolved_model_name,
                        "answer": answer,
                        "attempts": attempt,
                    },
                )
            except LessonGenerationParseError as exc:
                last_error = str(exc)
                attempts_json.append({"attempt": attempt, "error": last_error, "answer": answer})

        raise CourseStructureParseRetryError(
            last_error or "Course structure generation failed",
            response_json={
                "provider": self.text_generator.provider_name,
                "model": self.text_generator.resolved_model_name,
                "answer": last_answer,
                "attempts": len(attempts_json),
                "attempt_errors": attempts_json,
            },
        )

    async def _generate_text(self, prompt: str) -> str:
        return await self.text_generator.generate_text(prompt)


def create_course_structure_generator() -> CourseStructureGenerator:
    return CourseStructureGenerator()
