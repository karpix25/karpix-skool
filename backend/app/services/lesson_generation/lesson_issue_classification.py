from enum import StrEnum

from .lesson_review_payloads import LessonReviewIssue


class IssueSeverity(StrEnum):
    FATAL = "fatal"
    REPAIR = "repair"
    WARNING = "warning"


FATAL_ISSUE_CODES = frozenset(
    {
        "unsupported_claim",
        "source_contradiction",
        "unsafe_html",
        "source_gap",
        "missing_source_evidence",
    }
)

REPAIR_ISSUE_CODES = frozenset(
    {
        "goal_misalignment",
        "practice_misalignment",
        "missing_success_criteria",
        "weak_artifact",
        "missing_course_bridge",
        "structural_quality",
        "incomplete_explanation",
    }
)

WARNING_ISSUE_CODES = frozenset(
    {
        "clarity",
        "repetition",
        "limited_examples",
        "dry_tone",
        "minor_style",
    }
)


def classify_issue(issue: LessonReviewIssue | str) -> IssueSeverity:
    """Application-owned policy: model output cannot downgrade severity."""
    code = issue.code if isinstance(issue, LessonReviewIssue) else issue
    normalized = code.strip().casefold()
    if normalized in FATAL_ISSUE_CODES:
        return IssueSeverity.FATAL
    if normalized in REPAIR_ISSUE_CODES:
        return IssueSeverity.REPAIR
    return IssueSeverity.WARNING
