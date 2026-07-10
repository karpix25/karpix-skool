import json

import pytest

from app.services.lesson_generation.lesson_issue_classification import (
    IssueSeverity,
    classify_issue,
)
from app.services.lesson_generation.lesson_quality_report import (
    ReviewDecision,
    evaluate_lesson_review,
)
from app.services.lesson_generation.lesson_review_payloads import (
    LessonReviewIssue,
    LessonReviewPayload,
    parse_lesson_review,
)
from app.services.lesson_generation.lesson_review_prompts import build_lesson_review_prompt
from app.services.lesson_generation.parser import LessonGenerationParseError


def _review(score: int, issues: list[dict[str, object]] | None = None) -> LessonReviewPayload:
    return LessonReviewPayload.model_validate(
        {
            "scores": {
                "source_grounding": score,
                "goal_alignment": score,
                "practice_alignment": score,
                "artifact_quality": score,
                "course_continuity": score,
                "clarity": score,
            },
            "issues": issues or [],
            "summary": "Проверка завершена",
        }
    )


@pytest.mark.parametrize(
    ("score", "decision"),
    [(80, ReviewDecision.READY), (79, ReviewDecision.REPAIR), (65, ReviewDecision.REPAIR), (64, ReviewDecision.REWRITE)],
)
def test_score_thresholds_are_deterministic(score: int, decision: ReviewDecision) -> None:
    assert evaluate_lesson_review(_review(score)).decision is decision


def test_fatal_issue_blocks_even_a_high_scoring_lesson() -> None:
    report = evaluate_lesson_review(
        _review(95, [{"code": "unsupported_claim", "message": "Факт отсутствует в source pack"}])
    )

    assert report.decision is ReviewDecision.BLOCKED
    assert report.issues[0].severity is IssueSeverity.FATAL


def test_source_gap_has_specific_decision() -> None:
    report = evaluate_lesson_review(
        _review(95, [{"code": "source_gap", "message": "Источник не описывает шаг"}])
    )

    assert report.decision is ReviewDecision.SOURCE_GAP


def test_application_owns_issue_severity_and_unknown_codes_are_warnings() -> None:
    issue = LessonReviewIssue(code="new_model_code", message="Новая проблема")

    assert classify_issue(issue) is IssueSeverity.WARNING
    assert classify_issue("practice_misalignment") is IssueSeverity.REPAIR


def test_parse_review_rejects_out_of_range_scores() -> None:
    payload = json.loads(_review(90).model_dump_json())
    payload["scores"]["clarity"] = 101

    with pytest.raises(LessonGenerationParseError, match="clarity"):
        parse_lesson_review(json.dumps({"review": payload}, ensure_ascii=False))


def test_review_prompt_forbids_rewrite_and_exposes_machine_codes() -> None:
    prompt = build_lesson_review_prompt(
        course_title="Claude Code",
        module_title="Скилы",
        lesson_blueprint={"learning_outcome": "Создать скил"},
        evidence_pack={"evidence": []},
        lesson_payload={"title": "Первый скил"},
    )

    assert "Do not rewrite the lesson" in prompt
    assert "unsupported_claim" in prompt
    assert "application assigns severity" in prompt
