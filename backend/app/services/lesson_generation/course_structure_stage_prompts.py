import json

from ...models_generation import CourseStructureGenerationJob
from .course_generation_options import format_generation_option_lines, options_from_job
from .course_structure_stage_payloads import (
    CourseBlueprintLessonPayload,
    CourseBlueprintModulePayload,
    CourseBlueprintPayload,
    LessonSourcePackPayload,
)


def build_course_blueprint_from_brief_prompt(
    *,
    job: CourseStructureGenerationJob,
    course_title: str,
    source_brief: str,
    previous_error: str | None = None,
    previous_answer: str | None = None,
) -> str:
    option_lines = format_generation_option_lines(options_from_job(job))
    repair_block = _repair_block(previous_error=previous_error, previous_answer=previous_answer)
    return f"""
Design the curriculum blueprint for "{course_title}" from this source-grounded brief.

Return valid JSON only. Do not wrap it in markdown fences.
Choose the course structure yourself from the source depth and the course goal.
Create as many modules and lessons as needed to explain the topic thoroughly.
Use up to {job.module_count} modules.
Use up to {job.lessons_per_module} lessons per module.
Prefer fewer lessons only when the source is genuinely narrow.
Do not write lesson HTML yet.

Language: Russian.

Course settings:
{option_lines}

Source-grounded brief:
{source_brief}

Blueprint rules:
- Treat the OpenNotebook brief as the source of truth.
- Build a packaged course journey, not a topic dump.
- Modules must be meaningful course folders with a clear progression.
- The structure must maximize useful depth and clarity, not fit a fixed manual count.
- Every lesson needs a distinct learning_outcome, source_focus, and student_deliverable.
- Do not invent facts, names, numbers, tools, examples, or claims outside the brief.
- If source detail is thin, make the lesson deliverable a source-grounded diagnostic, checklist, or decision artifact.

JSON shape:
{{
  "transformation_goal": "student transformation in one concrete sentence",
  "modules": [
    {{
      "title": "module folder title",
      "module_outcome": "what the learner can do after this module",
      "lessons": [
        {{
          "title": "lesson title",
          "learning_outcome": "observable skill or decision",
          "student_deliverable": "artifact the student creates",
          "source_focus": "exact source themes this lesson must ask OpenNotebook about"
        }}
      ]
    }}
  ]
}}{repair_block}
""".strip()


def build_lesson_source_pack_prompt(
    *,
    course_title: str,
    module: CourseBlueprintModulePayload,
    lesson: CourseBlueprintLessonPayload,
    source_brief: str,
) -> str:
    return f"""
Extract the source-of-truth pack for one lesson in the course "{course_title}".

Use only the supplied OpenNotebook source context. Do not write the lesson.
Return valid JSON only. Do not wrap it in markdown fences.
If the source context does not support a requested detail, put it in source_gaps instead of inventing.

Language: Russian.

Course source brief:
{source_brief}

Module:
- Title: {module.title}
- Outcome: {module.module_outcome}

Lesson:
- Title: {lesson.title}
- Learning outcome: {lesson.learning_outcome}
- Student deliverable: {lesson.student_deliverable}
- Source focus: {lesson.source_focus}

JSON shape:
{{
  "source_pack": {{
    "facts": ["specific facts, names, tools, numbers, or claims present in the source"],
    "process_steps": ["source-grounded steps, sequence, framework, or workflow"],
    "examples": ["source-grounded cases, scripts, scenarios, or demonstrations"],
    "constraints": ["what the lesson must not overclaim or where source evidence is limited"],
    "source_gaps": ["needed details missing from the source context"],
    "source_basis_summary": "short summary of why this pack supports the lesson"
  }}
}}
""".strip()


def build_packaged_lesson_prompt(
    *,
    course_title: str,
    module: CourseBlueprintModulePayload,
    lesson: CourseBlueprintLessonPayload,
    source_pack: LessonSourcePackPayload,
    previous_error: str | None = None,
    previous_answer: str | None = None,
) -> str:
    source_pack_json = json.dumps(source_pack.model_dump(), ensure_ascii=False, indent=2)
    repair_block = _repair_block(previous_error=previous_error, previous_answer=previous_answer)
    return f"""
Write one complete Karpix Skool lesson for the course "{course_title}".

Return valid JSON only. Do not wrap it in markdown fences.
Use only the lesson source pack as factual truth.
Do not add facts, names, numbers, tools, examples, links, or claims outside the source pack.
Do not include images, iframes, scripts, styles, or external media.

Language: Russian.

Module:
- Title: {module.title}
- Outcome: {module.module_outcome}

Lesson blueprint:
- Title: {lesson.title}
- Learning outcome: {lesson.learning_outcome}
- Student deliverable: {lesson.student_deliverable}
- Source focus: {lesson.source_focus}

Lesson source pack:
{source_pack_json}

Packaging rules:
- Write a complete course lesson, not a summary card.
- Use 4-6 course-specific <h2> sections with unique titles.
- Include at least 900 visible text characters.
- Include at least 6 separate <p>...</p> paragraphs in the html string; list items and headings do not count as paragraphs.
- Include at least one <ul> or <ol> with 3+ concrete checklist, script, or exercise items.
- Include one source-grounded example, case, script, diagnostic, or workflow.
- End with a concrete student deliverable.
- Avoid the repeated generic pattern "Проблема / Что вы узнаете / Задание / Итог".

JSON shape:
{{
  "title": "{lesson.title}",
  "icon_emoji": "one relevant emoji",
  "html": "<h2>...</h2><p>...</p><ul><li>...</li></ul>",
  "media_plan": ["optional exact media asset the admin should add"]
}}{repair_block}
""".strip()


def _repair_block(*, previous_error: str | None, previous_answer: str | None) -> str:
    if not previous_error and not previous_answer:
        return ""
    return f"""

Previous output was rejected.
Error: {previous_error or "unknown"}
Rejected output:
{(previous_answer or "")[:4000]}

Return a corrected complete JSON object now. If the error mentions paragraphs, rewrite the html with at least 6 separate <p>...</p> tags.
""".rstrip()
