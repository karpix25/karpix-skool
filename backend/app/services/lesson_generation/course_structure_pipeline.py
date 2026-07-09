from dataclasses import dataclass
from typing import Any, Sequence

from ...models_generation import CourseStructureGenerationJob
from ...schemas.generation_sources import GenerationSourceInput
from ...schemas.lesson_generation import (
    GeneratedCourseModulePayload,
    GeneratedCourseStructurePayload,
    GeneratedLessonPayload,
)
from .course_structure_quality import (
    validate_generated_course_structure,
    validate_generated_lesson_quality,
)
from .course_structure_stage_payloads import (
    CourseBlueprintPayload,
    LessonSourcePackPayload,
    parse_course_blueprint,
    parse_lesson_source_pack,
    parse_packaged_lesson,
)
from .course_structure_stage_prompts import (
    build_course_blueprint_from_brief_prompt,
    build_lesson_source_pack_prompt,
    build_packaged_lesson_prompt,
)
from .open_notebook_client import OpenNotebookTransformation
from .parser import LessonGenerationParseError
from .provider import LessonGenerationProvider
from .structure_text_generator import StructureTextGenerator


MAX_STAGE_ATTEMPTS = 2


LESSON_SOURCE_PACK_TRANSFORMATION = OpenNotebookTransformation(
    name="karpix_lesson_source_pack_json",
    title="Karpix lesson source pack JSON",
    description="Extracts source-grounded evidence packs for individual Karpix lessons.",
    prompt=(
        "You extract source-of-truth JSON packs for Karpix lessons. Follow the task in "
        "the input exactly. Use only supplied source context. Return valid JSON only."
    ),
)


@dataclass(frozen=True)
class CourseStructurePipelineResult:
    generated: GeneratedCourseStructurePayload
    response_json: dict[str, Any]


class CourseStructurePipelineError(LessonGenerationParseError):
    def __init__(self, message: str, *, response_json: dict[str, Any]):
        super().__init__(message)
        self.response_json = response_json


class CourseStructurePipeline:
    def __init__(
        self,
        *,
        text_generator: StructureTextGenerator | None = None,
        attempts: int = MAX_STAGE_ATTEMPTS,
    ):
        self.text_generator = text_generator or StructureTextGenerator()
        self.attempts = max(1, attempts)

    async def generate(
        self,
        *,
        client: LessonGenerationProvider,
        sources: Sequence[GenerationSourceInput],
        notebook_id: str | None,
        source_brief: str,
        job: CourseStructureGenerationJob,
        course_title: str,
    ) -> CourseStructurePipelineResult:
        blueprint, blueprint_json = await self._generate_blueprint(
            source_brief=source_brief,
            job=job,
            course_title=course_title,
        )
        modules: list[GeneratedCourseModulePayload] = []
        lesson_audits = []

        for module_index, module_blueprint in enumerate(blueprint.modules):
            generated_lessons: list[GeneratedLessonPayload] = []
            for lesson_index, lesson_blueprint in enumerate(module_blueprint.lessons):
                source_pack_response = await client.ask_from_sources(
                    sources=sources,
                    question=build_lesson_source_pack_prompt(
                        course_title=course_title,
                        module=module_blueprint,
                        lesson=lesson_blueprint,
                        source_brief=source_brief,
                    ),
                    notebook_id=notebook_id,
                    transformation=LESSON_SOURCE_PACK_TRANSFORMATION,
                )
                try:
                    source_pack = parse_lesson_source_pack(source_pack_response["answer"])
                    lesson, lesson_json = await self._generate_lesson(
                        course_title=course_title,
                        module=module_blueprint,
                        lesson=lesson_blueprint,
                        source_pack=source_pack,
                    )
                except LessonGenerationParseError as exc:
                    raise CourseStructurePipelineError(
                        str(exc),
                        response_json=_failure_response_json(
                            text_generator=self.text_generator,
                            stage="lesson_source_pack_or_draft",
                            error=str(exc),
                            blueprint=blueprint,
                            blueprint_json=blueprint_json,
                            lesson_audits=lesson_audits,
                            failed_lesson={
                                "module_index": module_index,
                                "lesson_index": lesson_index,
                                "module_title": module_blueprint.title,
                                "lesson_title": lesson_blueprint.title,
                                "source_pack_response": _compact_source_response(source_pack_response),
                            },
                        ),
                    ) from exc
                generated_lessons.append(lesson)
                lesson_audits.append(
                    {
                        "module_index": module_index,
                        "lesson_index": lesson_index,
                        "module_title": module_blueprint.title,
                        "lesson_title": lesson_blueprint.title,
                        "source_pack": source_pack.model_dump(),
                        "source_pack_response": _compact_source_response(source_pack_response),
                        "lesson_generation": lesson_json,
                    }
                )

            modules.append(
                GeneratedCourseModulePayload(
                    title=module_blueprint.title,
                    lessons=generated_lessons,
                )
            )

        generated = GeneratedCourseStructurePayload(modules=modules)
        validate_generated_course_structure(generated=generated, job=job)
        return CourseStructurePipelineResult(
            generated=generated,
            response_json={
                "pipeline": "source_brief_blueprint_lesson_source_packs",
                "provider": self.text_generator.provider_name,
                "model": self.text_generator.resolved_model_name,
                "blueprint": blueprint.model_dump(),
                "blueprint_generation": blueprint_json,
                "lesson_audits": lesson_audits,
            },
        )

    async def _generate_blueprint(
        self,
        *,
        source_brief: str,
        job: CourseStructureGenerationJob,
        course_title: str,
    ) -> tuple[CourseBlueprintPayload, dict[str, Any]]:
        last_answer = None
        last_error = None
        attempts_json = []

        for attempt in range(1, self.attempts + 1):
            prompt = build_course_blueprint_from_brief_prompt(
                job=job,
                course_title=course_title,
                source_brief=source_brief,
                previous_error=last_error,
                previous_answer=last_answer,
            )
            answer = await self.text_generator.generate_text(prompt)
            last_answer = answer
            try:
                blueprint = parse_course_blueprint(
                    answer,
                    max_modules=job.module_count,
                    max_lessons_per_module=job.lessons_per_module,
                )
                return blueprint, _stage_response_json(self.text_generator, answer, attempt)
            except LessonGenerationParseError as exc:
                last_error = str(exc)
                attempts_json.append({"attempt": attempt, "error": last_error, "answer": answer})

        message = _retry_error_message("course blueprint", last_error, attempts_json)
        raise CourseStructurePipelineError(
            message,
            response_json={
                "pipeline": "source_brief_blueprint_lesson_source_packs",
                "provider": self.text_generator.provider_name,
                "model": self.text_generator.resolved_model_name,
                "failed_stage": "blueprint",
                "error": message,
                "blueprint_generation": {"attempt_errors": attempts_json},
            },
        )

    async def _generate_lesson(
        self,
        *,
        course_title: str,
        module,
        lesson,
        source_pack: LessonSourcePackPayload,
    ) -> tuple[GeneratedLessonPayload, dict[str, Any]]:
        last_answer = None
        last_error = None
        attempts_json = []

        for attempt in range(1, self.attempts + 1):
            prompt = build_packaged_lesson_prompt(
                course_title=course_title,
                module=module,
                lesson=lesson,
                source_pack=source_pack,
                previous_error=last_error,
                previous_answer=last_answer,
            )
            answer = await self.text_generator.generate_text(prompt)
            last_answer = answer
            try:
                generated = parse_packaged_lesson(answer)
                validate_generated_lesson_quality(generated)
                return generated, _stage_response_json(self.text_generator, answer, attempt)
            except LessonGenerationParseError as exc:
                last_error = str(exc)
                attempts_json.append({"attempt": attempt, "error": last_error, "answer": answer})

        raise LessonGenerationParseError(
            _retry_error_message(f'lesson "{lesson.title}"', last_error, attempts_json)
        )


def create_course_structure_pipeline() -> CourseStructurePipeline:
    return CourseStructurePipeline()


def _stage_response_json(
    text_generator: StructureTextGenerator,
    answer: str,
    attempts: int,
) -> dict[str, Any]:
    return {
        "provider": text_generator.provider_name,
        "model": text_generator.resolved_model_name,
        "answer": answer,
        "attempts": attempts,
    }


def _retry_error_message(stage: str, last_error: str | None, attempts: list[dict[str, Any]]) -> str:
    suffix = f": {last_error}" if last_error else ""
    return f"Failed to generate valid {stage} after {len(attempts)} attempts{suffix}"


def _compact_source_response(source_response: dict[str, Any]) -> dict[str, Any]:
    return {
        "provider": source_response.get("provider"),
        "notebook_id": source_response.get("notebook_id"),
        "source_id": source_response.get("source_id"),
        "source_ids": source_response.get("source_ids"),
        "transformation_id": source_response.get("transformation_id"),
        "model_id": source_response.get("model_id"),
    }


def _failure_response_json(
    *,
    text_generator: StructureTextGenerator,
    stage: str,
    error: str,
    blueprint: CourseBlueprintPayload,
    blueprint_json: dict[str, Any],
    lesson_audits: list[dict[str, Any]],
    failed_lesson: dict[str, Any],
) -> dict[str, Any]:
    return {
        "pipeline": "source_brief_blueprint_lesson_source_packs",
        "provider": text_generator.provider_name,
        "model": text_generator.resolved_model_name,
        "failed_stage": stage,
        "error": error,
        "blueprint": blueprint.model_dump(),
        "blueprint_generation": blueprint_json,
        "lesson_audits": lesson_audits,
        "failed_lesson": failed_lesson,
    }
