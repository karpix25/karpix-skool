import json

from .course_structure_stage_payloads import (
    CourseBlueprintLessonPayload,
    CourseBlueprintModulePayload,
    ProductCourseStrategyPayload,
)


def build_lesson_evidence_prompt(
    *,
    course_title: str,
    module: CourseBlueprintModulePayload,
    lesson: CourseBlueprintLessonPayload,
    source_brief: str,
    product_strategy: ProductCourseStrategyPayload,
) -> str:
    strategy_json = json.dumps(product_strategy.model_dump(), ensure_ascii=False, indent=2)
    return f"""
Extract verified evidence for one lesson in the course "{course_title}".

Return valid JSON only. Do not use markdown fences. Do not write the lesson.
Use only the supplied Open Notebook source context. Every evidence item must contain
an exact short quote and the source_id that owns that quote. Never fabricate a quote.
Language: Russian.

Product strategy:
{strategy_json}

Course source brief:
{source_brief}

Module:
- Title: {module.title}
- Outcome: {module.module_outcome}
- Final project piece: {module.final_project_piece}

Lesson:
- Title: {lesson.title}
- Learning outcome: {lesson.learning_outcome}
- Student deliverable: {lesson.student_deliverable}
- Source focus: {lesson.source_focus}
- Course path bridge: {lesson.course_path_bridge}

Rules:
- Use evidence kinds: fact, process_step, example, constraint.
- claim is the fact or instruction the writer may use.
- quote must be copied from full_text of the selected source.
- source_id and source_title must match the supplied source context.
- lesson_use explains why the evidence belongs in this lesson.
- Mark sufficiency partial when a narrower lesson is possible.
- Mark sufficiency insufficient and list source_gaps when the lesson cannot be grounded.

JSON shape:
{{
  "evidence_pack": {{
    "evidence": [
      {{
        "kind": "fact",
        "claim": "source-grounded claim",
        "quote": "exact short source quote",
        "source_id": "source:123",
        "source_title": "source title",
        "location_hint": "section or timestamp, or null",
        "lesson_use": "how this evidence supports the lesson"
      }}
    ],
    "source_gaps": [],
    "sufficiency": "sufficient",
    "source_basis_summary": "why these sources support the lesson"
  }}
}}
""".strip()
