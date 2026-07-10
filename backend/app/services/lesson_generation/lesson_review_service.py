from dataclasses import dataclass
from typing import Any

from ...schemas.lesson_generation import GeneratedLessonPayload
from .course_structure_stage_payloads import CourseBlueprintLessonPayload
from .lesson_quality_report import LessonQualityReport, evaluate_lesson_review
from .lesson_review_payloads import LessonReviewPayload, parse_lesson_review
from .lesson_review_prompts import build_lesson_review_prompt
from .structure_text_generator import StructureTextGenerator


@dataclass(frozen=True)
class LessonReviewResult:
    payload: LessonReviewPayload
    report: LessonQualityReport
    audit: dict[str, Any]


class LessonReviewService:
    """Run model review while keeping severity and decisions application-owned."""

    def __init__(self, *, text_generator: StructureTextGenerator | None = None) -> None:
        self.text_generator = text_generator or StructureTextGenerator(role="reviewer")

    async def review(
        self,
        *,
        course_title: str,
        module_title: str,
        lesson_blueprint: CourseBlueprintLessonPayload,
        evidence_pack: dict[str, Any],
        generated_lesson: GeneratedLessonPayload,
    ) -> LessonReviewResult:
        prompt = build_lesson_review_prompt(
            course_title=course_title,
            module_title=module_title,
            lesson_blueprint=lesson_blueprint.model_dump(mode="json"),
            evidence_pack=evidence_pack,
            lesson_payload=generated_lesson.model_dump(mode="json"),
        )
        answer = await self.text_generator.generate_text(prompt)
        payload = parse_lesson_review(answer)
        report = evaluate_lesson_review(payload)
        return LessonReviewResult(
            payload=payload,
            report=report,
            audit={
                "provider": self.text_generator.provider_name,
                "model": self.text_generator.resolved_model_name,
                "answer": answer,
                "report": report.model_dump(mode="json"),
            },
        )
