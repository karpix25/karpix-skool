import json
from typing import Any


def build_lesson_review_prompt(
    *,
    course_title: str,
    module_title: str,
    lesson_blueprint: dict[str, Any],
    evidence_pack: dict[str, Any],
    lesson_payload: dict[str, Any],
) -> str:
    """Build a reviewer request; severity and final decisions remain application-owned."""
    blueprint_json = json.dumps(lesson_blueprint, ensure_ascii=False, indent=2)
    evidence_json = json.dumps(evidence_pack, ensure_ascii=False, indent=2)
    lesson_json = json.dumps(lesson_payload, ensure_ascii=False, indent=2)
    return f"""
Review one generated lesson for the course "{course_title}", module "{module_title}".

Return valid JSON only. Do not use markdown fences. Do not rewrite the lesson.
Use the evidence pack as the only factual source of truth.
Report concrete issues with machine-readable codes. The application assigns severity.
Language: Russian.

Lesson blueprint:
{blueprint_json}

Verified evidence pack:
{evidence_json}

Generated lesson:
{lesson_json}

Score each dimension from 0 to 100:
- source_grounding: every factual claim is supported by the evidence pack.
- goal_alignment: content teaches the stated learning outcome.
- practice_alignment: practice uses what the lesson explains.
- artifact_quality: the learner creates a concrete, checkable deliverable.
- course_continuity: the result prepares or uses the next course step.
- clarity: concise, understandable Russian without unnecessary jargon.

Allowed issue codes:
- unsupported_claim, source_contradiction, unsafe_html, source_gap, missing_source_evidence
- goal_misalignment, practice_misalignment, missing_success_criteria, weak_artifact
- missing_course_bridge, structural_quality, incomplete_explanation
- clarity, repetition, limited_examples, dry_tone, minor_style

JSON shape:
{{
  "review": {{
    "scores": {{
      "source_grounding": 0,
      "goal_alignment": 0,
      "practice_alignment": 0,
      "artifact_quality": 0,
      "course_continuity": 0,
      "clarity": 0
    }},
    "issues": [
      {{
        "code": "allowed_issue_code",
        "message": "specific observed problem",
        "section": "affected section or null",
        "repair_instruction": "smallest precise repair or null",
        "evidence_indices": [0]
      }}
    ],
    "summary": "short assessment"
  }}
}}
""".strip()
