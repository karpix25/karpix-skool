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
    ProductCourseStrategyPayload,
    fallback_lesson_source_pack,
    parse_course_blueprint,
    parse_lesson_source_pack,
    parse_packaged_lesson,
    parse_product_course_strategy,
)
from .course_structure_stage_prompts import (
    build_course_blueprint_from_brief_prompt,
    build_lesson_source_pack_structuring_prompt,
    build_lesson_source_pack_prompt,
    build_packaged_lesson_prompt,
    build_product_course_strategy_prompt,
)
from .lesson_repairs import ensure_course_path_bridge
from .open_notebook_client import OpenNotebookTransformation
from .parser import LessonGenerationParseError
from .provider import LessonGenerationProvider
from .structure_text_generator import StructureTextGenerator


MAX_STAGE_ATTEMPTS = 2


LESSON_SOURCE_PACK_TRANSFORMATION = OpenNotebookTransformation(
    name="karpix_lesson_source_pack_human_notes",
    title="Karpix lesson source notes",
    description="Collects human-readable source-grounded notes for individual Karpix lessons.",
    prompt=(
        "Answer as a helpful research assistant. Use only supplied source context. "
        "Write normal human-readable notes. Do not return JSON or code."
    ),
    include_source_contexts=True,
)


@dataclass(frozen=True)
class CourseStructurePipelineResult:
    generated: GeneratedCourseStructurePayload
    response_json: dict[str, Any]


class CourseStructurePipelineError(LessonGenerationParseError):
    def __init__(self, message: str, *, response_json: dict[str, Any]):
        super().__init__(message)
        self.response_json = response_json


class LessonDraftGenerationError(LessonGenerationParseError):
    def __init__(self, message: str, *, attempt_errors: list[dict[str, Any]]):
        super().__init__(message)
        self.attempt_errors = attempt_errors


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
        product_strategy, product_strategy_json = await self._generate_product_strategy(
            source_brief=source_brief,
            job=job,
            course_title=course_title,
        )
        blueprint, blueprint_json = await self._generate_blueprint(
            source_brief=source_brief,
            job=job,
            course_title=course_title,
            product_strategy=product_strategy,
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
                        product_strategy=product_strategy,
                    ),
                    notebook_id=notebook_id,
                    transformation=LESSON_SOURCE_PACK_TRANSFORMATION,
                )
                try:
                    try:
                        source_pack = parse_lesson_source_pack(source_pack_response["answer"])
                        source_pack_fallback_reason = None
                    except LessonGenerationParseError as exc:
                        if "too little source evidence" in str(exc):
                            raise
                        source_pack, source_pack_fallback_reason, source_pack_fallback_error = (
                            await self._source_pack_from_human_answer(
                                course_title=course_title,
                                module=module_blueprint,
                                lesson=lesson_blueprint,
                                source_brief=source_brief,
                                source_pack_response=source_pack_response,
                                parse_error=str(exc),
                            )
                        )
                    lesson, lesson_json = await self._generate_lesson(
                        course_title=course_title,
                        module=module_blueprint,
                        lesson=lesson_blueprint,
                        source_pack=source_pack,
                        product_strategy=product_strategy,
                    )
                except LessonGenerationParseError as exc:
                    failed_lesson = {
                        "module_index": module_index,
                        "lesson_index": lesson_index,
                        "module_title": module_blueprint.title,
                        "lesson_title": lesson_blueprint.title,
                        "source_pack_response": _compact_source_response(source_pack_response),
                    }
                    if isinstance(exc, LessonDraftGenerationError):
                        failed_lesson["lesson_generation"] = {
                            "attempt_errors": exc.attempt_errors,
                        }
                    raise CourseStructurePipelineError(
                        str(exc),
                        response_json=_failure_response_json(
                            text_generator=self.text_generator,
                            stage="lesson_source_pack_or_draft",
                            error=str(exc),
                            product_strategy=product_strategy,
                            product_strategy_json=product_strategy_json,
                            blueprint=blueprint,
                            blueprint_json=blueprint_json,
                            lesson_audits=lesson_audits,
                            failed_lesson=failed_lesson,
                        ),
                    ) from exc
                generated_lessons.append(lesson)
                lesson_audits.append(
                    {
                        "module_index": module_index,
                        "lesson_index": lesson_index,
                        "module_title": module_blueprint.title,
                        "lesson_title": lesson_blueprint.title,
                        "lesson_blueprint": lesson_blueprint.model_dump(),
                        "source_pack": source_pack.model_dump(),
                        "source_pack_response": _compact_source_response(source_pack_response),
                        "methodology": _lesson_methodology_audit(
                            lesson_blueprint=lesson_blueprint,
                            source_pack=source_pack,
                            lesson=lesson,
                        ),
                        "lesson_generation": lesson_json,
                    }
                )
                if source_pack_fallback_reason:
                    lesson_audits[-1]["source_pack_fallback_reason"] = source_pack_fallback_reason
                    lesson_audits[-1]["source_pack_fallback_error"] = source_pack_fallback_error

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
                "pipeline": "source_brief_product_strategy_blueprint_lesson_source_packs",
                "provider": self.text_generator.provider_name,
                "model": self.text_generator.resolved_model_name,
                "methodology": _methodology_snapshot(job),
                "product_strategy": product_strategy.model_dump(),
                "product_strategy_generation": product_strategy_json,
                "blueprint": blueprint.model_dump(),
                "blueprint_generation": blueprint_json,
                "lesson_audits": lesson_audits,
            },
        )

    async def _generate_product_strategy(
        self,
        *,
        source_brief: str,
        job: CourseStructureGenerationJob,
        course_title: str,
    ) -> tuple[ProductCourseStrategyPayload, dict[str, Any]]:
        last_answer = None
        last_error = None
        attempts_json = []

        for attempt in range(1, self.attempts + 1):
            prompt = build_product_course_strategy_prompt(
                job=job,
                course_title=course_title,
                source_brief=source_brief,
                previous_error=last_error,
                previous_answer=last_answer,
            )
            answer = await self.text_generator.generate_text(prompt)
            last_answer = answer
            try:
                strategy = parse_product_course_strategy(answer)
                return strategy, _stage_response_json(self.text_generator, answer, attempt)
            except LessonGenerationParseError as exc:
                last_error = str(exc)
                attempts_json.append({"attempt": attempt, "error": last_error, "answer": answer})

        message = _retry_error_message("product course strategy", last_error, attempts_json)
        raise CourseStructurePipelineError(
            message,
            response_json={
                "pipeline": "source_brief_product_strategy_blueprint_lesson_source_packs",
                "provider": self.text_generator.provider_name,
                "model": self.text_generator.resolved_model_name,
                "failed_stage": "product_strategy",
                "error": message,
                "product_strategy_generation": {"attempt_errors": attempts_json},
            },
        )

    async def _generate_blueprint(
        self,
        *,
        source_brief: str,
        job: CourseStructureGenerationJob,
        course_title: str,
        product_strategy: ProductCourseStrategyPayload,
    ) -> tuple[CourseBlueprintPayload, dict[str, Any]]:
        last_answer = None
        last_error = None
        attempts_json = []

        for attempt in range(1, self.attempts + 1):
            prompt = build_course_blueprint_from_brief_prompt(
                job=job,
                course_title=course_title,
                source_brief=source_brief,
                product_strategy=product_strategy,
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
                "pipeline": "source_brief_product_strategy_blueprint_lesson_source_packs",
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
        product_strategy: ProductCourseStrategyPayload,
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
                product_strategy=product_strategy,
                previous_error=last_error,
                previous_answer=last_answer,
            )
            answer = await self.text_generator.generate_text(prompt)
            last_answer = answer
            try:
                generated = parse_packaged_lesson(answer)
                generated, bridge_repaired = ensure_course_path_bridge(
                    generated,
                    bridge=lesson.course_path_bridge,
                )
                validate_generated_lesson_quality(generated)
                response_json = _stage_response_json(self.text_generator, answer, attempt)
                if bridge_repaired:
                    response_json["repairs"] = ["course_path_bridge_appended"]
                return generated, response_json
            except LessonGenerationParseError as exc:
                last_error = str(exc)
                attempts_json.append({"attempt": attempt, "error": last_error, "answer": answer})

        raise LessonDraftGenerationError(
            _retry_error_message(f'lesson "{lesson.title}"', last_error, attempts_json),
            attempt_errors=attempts_json,
        )

    async def _source_pack_from_human_answer(
        self,
        *,
        course_title: str,
        module,
        lesson,
        source_brief: str,
        source_pack_response: dict[str, Any],
        parse_error: str,
    ) -> tuple[LessonSourcePackPayload, str, str]:
        answer = str(source_pack_response.get("answer") or "")
        contexts = source_pack_response.get("source_contexts") or []
        if answer.strip() and contexts:
            structured_answer = await self.text_generator.generate_text(
                build_lesson_source_pack_structuring_prompt(
                    course_title=course_title,
                    module=module,
                    lesson=lesson,
                    notebook_answer=answer,
                    source_contexts=contexts,
                )
            )
            try:
                return parse_lesson_source_pack(structured_answer), "human_notes_structured", parse_error
            except LessonGenerationParseError as exc:
                parse_error = f"{parse_error}; structured source pack error: {exc}"

        return (
            fallback_lesson_source_pack(
                lesson=lesson,
                source_brief=source_brief,
                source_contexts=contexts,
            ),
            "open_notebook_empty_lesson_source_pack"
            if source_pack_response.get("empty_output")
            else "open_notebook_invalid_lesson_source_pack",
            parse_error,
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


def _methodology_snapshot(job: CourseStructureGenerationJob) -> dict[str, Any]:
    request_json = job.request_json if isinstance(job.request_json, dict) else {}
    return {
        key: request_json.get(key)
        for key in ("point_a", "point_b", "global_benefit", "author_experience")
        if request_json.get(key)
    }


def _lesson_methodology_audit(
    *,
    lesson_blueprint,
    source_pack: LessonSourcePackPayload,
    lesson: GeneratedLessonPayload,
) -> dict[str, Any]:
    return {
        "author_story_hint": (
            lesson.author_story_hint
            or source_pack.author_story_hint
            or lesson_blueprint.author_story_hint
        ),
        "admin_note": lesson.admin_note or source_pack.admin_note or lesson_blueprint.admin_note,
    }


def _failure_response_json(
    *,
    text_generator: StructureTextGenerator,
    stage: str,
    error: str,
    product_strategy: ProductCourseStrategyPayload,
    product_strategy_json: dict[str, Any],
    blueprint: CourseBlueprintPayload,
    blueprint_json: dict[str, Any],
    lesson_audits: list[dict[str, Any]],
    failed_lesson: dict[str, Any],
) -> dict[str, Any]:
    return {
        "pipeline": "source_brief_product_strategy_blueprint_lesson_source_packs",
        "provider": text_generator.provider_name,
        "model": text_generator.resolved_model_name,
        "failed_stage": stage,
        "error": error,
        "product_strategy": product_strategy.model_dump(),
        "product_strategy_generation": product_strategy_json,
        "blueprint": blueprint.model_dump(),
        "blueprint_generation": blueprint_json,
        "lesson_audits": lesson_audits,
        "failed_lesson": failed_lesson,
    }
