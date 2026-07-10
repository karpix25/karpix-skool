from dataclasses import dataclass
from enum import StrEnum
from typing import Any, Sequence

from ...schemas.generation_sources import GenerationSourceInput
from ...schemas.lesson_generation import GeneratedLessonPayload
from .course_structure_quality import validate_generated_lesson_quality
from .course_structure_stage_payloads import (
    CourseBlueprintLessonPayload,
    CourseBlueprintModulePayload,
    LessonSourcePackPayload,
    ProductCourseStrategyPayload,
    fallback_lesson_source_pack,
    parse_lesson_source_pack,
    parse_packaged_lesson,
)
from .course_structure_stage_prompts import build_packaged_lesson_prompt
from .lesson_evidence_prompts import build_lesson_evidence_prompt
from .lesson_quality_report import ReviewDecision
from .lesson_repairs import ensure_course_path_bridge
from .lesson_review_service import LessonReviewResult, LessonReviewService
from .open_notebook_client import OpenNotebookTransformation
from .parser import LessonGenerationParseError
from .provider import LessonGenerationProvider
from .source_evidence import (
    LessonEvidencePack,
    legacy_source_pack_to_evidence,
    parse_lesson_evidence_pack,
    verify_evidence_pack,
)
from .structure_text_generator import StructureTextGenerator


LESSON_EVIDENCE_TRANSFORMATION = OpenNotebookTransformation(
    name="karpix_lesson_evidence_json",
    title="Karpix lesson evidence JSON",
    description="Extracts source-grounded evidence for one course lesson.",
    prompt="Use only supplied source context. Return the requested valid JSON only.",
    include_source_contexts=True,
)


class LessonDraftStatus(StrEnum):
    READY = "ready"
    NEEDS_REVIEW = "needs_review"
    BLOCKED = "blocked"
    SOURCE_GAP = "source_gap"


@dataclass(frozen=True)
class LessonDraftResult:
    lesson: GeneratedLessonPayload
    source_pack: LessonSourcePackPayload
    evidence_pack: LessonEvidencePack
    review: LessonReviewResult
    status: LessonDraftStatus
    audit: dict[str, Any]


class LessonDraftStageError(LessonGenerationParseError):
    def __init__(self, message: str, *, audit: dict[str, Any]):
        super().__init__(message)
        self.audit = audit


class LessonDraftPipeline:
    def __init__(
        self,
        *,
        writer: StructureTextGenerator | None = None,
        reviewer: LessonReviewService | None = None,
        attempts: int = 2,
    ) -> None:
        self.writer = writer or StructureTextGenerator(role="writer")
        self.reviewer = reviewer or LessonReviewService()
        self.attempts = max(1, attempts)

    async def generate(
        self,
        *,
        client: LessonGenerationProvider,
        sources: Sequence[GenerationSourceInput],
        notebook_id: str | None,
        source_brief: str,
        course_title: str,
        module: CourseBlueprintModulePayload,
        lesson: CourseBlueprintLessonPayload,
        product_strategy: ProductCourseStrategyPayload,
        cached_source_pack: LessonSourcePackPayload | None = None,
        cached_evidence_pack: LessonEvidencePack | None = None,
    ) -> LessonDraftResult:
        if cached_source_pack is not None and cached_evidence_pack is not None:
            source_pack = cached_source_pack
            evidence_pack = cached_evidence_pack
            evidence_audit = {"format": "cached", "cache_hit": True}
        else:
            source_response = await client.ask_from_sources(
                sources=sources,
                question=build_lesson_evidence_prompt(
                    course_title=course_title,
                    module=module,
                    lesson=lesson,
                    source_brief=source_brief,
                    product_strategy=product_strategy,
                ),
                notebook_id=notebook_id,
                transformation=LESSON_EVIDENCE_TRANSFORMATION,
            )
            source_pack, evidence_pack, evidence_audit = self._parse_source_response(
                source_response=source_response, source_brief=source_brief, lesson=lesson
            )
        generated, generation_audit = await self._write_valid_lesson(
            course_title=course_title,
            module=module,
            lesson=lesson,
            source_pack=source_pack,
            product_strategy=product_strategy,
        )
        review = await self._review(
            course_title=course_title, module=module, lesson=lesson,
            evidence_pack=evidence_pack, generated=generated,
        )
        revised = False
        if review.report.decision in {ReviewDecision.REPAIR, ReviewDecision.REWRITE}:
            generated, revision_audit = await self._write_revision(
                course_title=course_title, module=module, lesson=lesson,
                source_pack=source_pack, product_strategy=product_strategy,
                generated=generated, review=review,
            )
            generation_audit["review_revision"] = revision_audit
            revised = True
            review = await self._review(
                course_title=course_title, module=module, lesson=lesson,
                evidence_pack=evidence_pack, generated=generated,
            )
        status = _status_from_decision(review.report.decision)
        return LessonDraftResult(
            lesson=generated,
            source_pack=source_pack,
            evidence_pack=evidence_pack,
            review=review,
            status=status,
            audit={
                "source": evidence_audit,
                "generation": generation_audit,
                "review": review.audit,
                "review_revision_used": revised,
            },
        )

    def _parse_source_response(
        self,
        *,
        source_response: dict[str, Any],
        source_brief: str,
        lesson: CourseBlueprintLessonPayload,
    ) -> tuple[LessonSourcePackPayload, LessonEvidencePack, dict[str, Any]]:
        answer = str(source_response.get("answer") or "")
        contexts = source_response.get("source_contexts") or []
        evidence_error: str | None = None
        try:
            evidence = parse_lesson_evidence_pack(answer)
            if evidence.sufficiency == "insufficient":
                raise LessonDraftStageError("Source evidence is insufficient for this lesson", audit={
                    "source_gaps": evidence.source_gaps,
                })
            verification = verify_evidence_pack(evidence, contexts) if contexts else None
            if verification is not None and not verification.is_valid:
                raise LessonDraftStageError("Lesson evidence failed source verification", audit={
                    "verification": verification.model_dump(mode="json"),
                })
            return (
                _evidence_to_legacy_pack(evidence, lesson),
                evidence,
                {
                    "format": "cited_evidence",
                    "verification": verification.model_dump(mode="json") if verification else None,
                    "source_response": _compact_source_response(source_response),
                },
            )
        except LessonDraftStageError:
            raise
        except LessonGenerationParseError as exc:
            evidence_error = str(exc)

        try:
            legacy = parse_lesson_source_pack(answer)
            fallback_reason = None
        except LessonGenerationParseError as exc:
            if "too little source evidence" in str(exc):
                raise LessonDraftStageError(str(exc), audit={"evidence_error": evidence_error}) from exc
            legacy = fallback_lesson_source_pack(
                lesson=lesson,
                source_brief=source_brief,
                source_contexts=contexts,
            )
            fallback_reason = "invalid_or_empty_source_pack"
        evidence = legacy_source_pack_to_evidence(legacy)
        return legacy, evidence, {
            "format": "legacy",
            "fallback_reason": fallback_reason,
            "evidence_parse_error": evidence_error,
            "source_response": _compact_source_response(source_response),
        }

    async def _write_valid_lesson(self, **prompt_args) -> tuple[GeneratedLessonPayload, dict[str, Any]]:
        previous_answer = previous_error = None
        errors: list[dict[str, Any]] = []
        for attempt in range(1, self.attempts + 1):
            prompt = build_packaged_lesson_prompt(
                **prompt_args,
                previous_error=previous_error,
                previous_answer=previous_answer,
            )
            answer = await self.writer.generate_text(prompt)
            previous_answer = answer
            try:
                generated, repairs = _parse_repair_validate(answer, prompt_args["lesson"])
                return generated, _generation_audit(self.writer, answer, attempt, errors, repairs)
            except LessonGenerationParseError as exc:
                previous_error = str(exc)
                errors.append({"attempt": attempt, "error": previous_error, "answer": answer})
        raise LessonDraftStageError(
            f"Failed to generate valid lesson after {len(errors)} attempts: {previous_error}",
            audit={"attempt_errors": errors},
        )

    async def _write_revision(self, *, generated, review, **prompt_args):
        instructions = [issue.repair_instruction or issue.message for issue in review.report.issues]
        error = "Reviewer requested one bounded revision: " + "; ".join(instructions[:8])
        prompt = build_packaged_lesson_prompt(
            **prompt_args,
            previous_error=error,
            previous_answer=generated.model_dump_json(),
        )
        answer = await self.writer.generate_text(prompt)
        revised, repairs = _parse_repair_validate(answer, prompt_args["lesson"])
        return revised, _generation_audit(self.writer, answer, 1, [], repairs)

    async def _review(self, *, course_title, module, lesson, evidence_pack, generated):
        return await self.reviewer.review(
            course_title=course_title,
            module_title=module.title,
            lesson_blueprint=lesson,
            evidence_pack=evidence_pack.model_dump(mode="json"),
            generated_lesson=generated,
        )


def _parse_repair_validate(answer: str, lesson: CourseBlueprintLessonPayload):
    generated = parse_packaged_lesson(answer)
    generated, bridge_repaired = ensure_course_path_bridge(
        generated,
        bridge=lesson.course_path_bridge,
    )
    validate_generated_lesson_quality(generated)
    return generated, ["course_path_bridge_appended"] if bridge_repaired else []


def _evidence_to_legacy_pack(
    evidence: LessonEvidencePack,
    lesson: CourseBlueprintLessonPayload,
) -> LessonSourcePackPayload:
    by_kind = {kind: [] for kind in ("fact", "process_step", "example", "constraint")}
    for item in evidence.evidence:
        by_kind[item.kind.value].append(item.claim)
    return LessonSourcePackPayload(
        facts=by_kind["fact"],
        process_steps=by_kind["process_step"],
        examples=by_kind["example"],
        constraints=by_kind["constraint"],
        source_gaps=evidence.source_gaps,
        source_basis_summary=evidence.source_basis_summary,
        author_story_hint=lesson.author_story_hint,
        admin_note=lesson.admin_note,
    )


def _status_from_decision(decision: ReviewDecision) -> LessonDraftStatus:
    if decision is ReviewDecision.READY:
        return LessonDraftStatus.READY
    if decision is ReviewDecision.SOURCE_GAP:
        return LessonDraftStatus.SOURCE_GAP
    if decision is ReviewDecision.BLOCKED:
        return LessonDraftStatus.BLOCKED
    return LessonDraftStatus.NEEDS_REVIEW


def _generation_audit(generator, answer, attempt, errors, repairs):
    return {
        "provider": generator.provider_name,
        "model": generator.resolved_model_name,
        "answer": answer,
        "attempts": attempt,
        "attempt_errors": errors,
        "repairs": repairs,
    }


def _compact_source_response(response: dict[str, Any]) -> dict[str, Any]:
    return {
        key: response.get(key)
        for key in ("provider", "notebook_id", "source_id", "source_ids", "transformation_id", "model_id")
    }
