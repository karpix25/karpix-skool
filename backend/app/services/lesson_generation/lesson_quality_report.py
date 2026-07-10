from enum import StrEnum

from pydantic import BaseModel, Field

from .lesson_issue_classification import IssueSeverity, classify_issue
from .lesson_review_payloads import LessonReviewIssue, LessonReviewPayload


class ReviewDecision(StrEnum):
    READY = "ready"
    REPAIR = "repair"
    REWRITE = "rewrite"
    BLOCKED = "blocked"
    SOURCE_GAP = "source_gap"


class ClassifiedLessonIssue(BaseModel):
    code: str
    message: str
    section: str | None = None
    repair_instruction: str | None = None
    evidence_indices: list[int] = Field(default_factory=list)
    severity: IssueSeverity


class LessonQualityReport(BaseModel):
    score: int = Field(ge=0, le=100)
    decision: ReviewDecision
    issues: list[ClassifiedLessonIssue] = Field(default_factory=list)
    summary: str

    @property
    def blocking_issues(self) -> list[ClassifiedLessonIssue]:
        return [issue for issue in self.issues if issue.severity is IssueSeverity.FATAL]


SCORE_WEIGHTS = {
    "source_grounding": 30,
    "goal_alignment": 20,
    "practice_alignment": 20,
    "artifact_quality": 15,
    "course_continuity": 10,
    "clarity": 5,
}


def evaluate_lesson_review(review: LessonReviewPayload) -> LessonQualityReport:
    score_values = review.scores.model_dump()
    weighted_score = round(
        sum(score_values[name] * weight for name, weight in SCORE_WEIGHTS.items()) / 100
    )
    issues = [_classify(issue) for issue in review.issues]
    decision = _decision(weighted_score, issues)
    return LessonQualityReport(
        score=weighted_score,
        decision=decision,
        issues=issues,
        summary=review.summary,
    )


def _classify(issue: LessonReviewIssue) -> ClassifiedLessonIssue:
    return ClassifiedLessonIssue(
        **issue.model_dump(),
        severity=classify_issue(issue),
    )


def _decision(score: int, issues: list[ClassifiedLessonIssue]) -> ReviewDecision:
    fatal_codes = {issue.code.casefold() for issue in issues if issue.severity is IssueSeverity.FATAL}
    if "source_gap" in fatal_codes or "missing_source_evidence" in fatal_codes:
        return ReviewDecision.SOURCE_GAP
    if fatal_codes:
        return ReviewDecision.BLOCKED
    if score >= 80:
        return ReviewDecision.READY
    if score >= 65:
        return ReviewDecision.REPAIR
    return ReviewDecision.REWRITE
