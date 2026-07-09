import json

from ...models_generation import CourseStructureGenerationJob
from .course_generation_options import format_generation_option_lines, options_from_job
from .course_structure_stage_payloads import (
    CourseBlueprintLessonPayload,
    CourseBlueprintModulePayload,
    CourseBlueprintPayload,
    LessonSourcePackPayload,
    ProductCourseStrategyPayload,
)


def build_product_course_strategy_prompt(
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
Create the product strategy for a sellable online course "{course_title}".

Return valid JSON only. Do not wrap it in markdown fences.
Use only the source-grounded brief. Do not invent facts, numbers, tools, examples, or claims.
If the source contains several possible course directions, select one strongest commercial path.

Language: Russian.

Course settings:
{option_lines}

Source-grounded brief:
{source_brief}

Strategy rules:
- Define one primary target student, not several unrelated audiences.
- Define one clear transformation: before state, after state, and final practical project.
- The final project must be something the student builds across the course.
- Keep the angle simple enough to sell and understand from the course title.
- State the proof boundary: what can be claimed from the source, and what must not be overpromised.
- Describe the module progression as a step-by-step path to the final project.

JSON shape:
{{
  "product_promise": "one concrete promise a buyer can understand",
  "target_student": "specific learner and current context",
  "start_state": "what the learner has before the course",
  "end_state": "what the learner can do or has built after the course",
  "final_project": "one practical project assembled across all modules",
  "course_angle": "why this course is commercially coherent",
  "proof_boundary": "source-grounded limits and claims to avoid",
  "module_progression_logic": [
    "first milestone",
    "second milestone",
    "third milestone"
  ]
}}{repair_block}
""".strip()


def build_course_blueprint_from_brief_prompt(
    *,
    job: CourseStructureGenerationJob,
    course_title: str,
    source_brief: str,
    product_strategy: ProductCourseStrategyPayload,
    previous_error: str | None = None,
    previous_answer: str | None = None,
) -> str:
    option_lines = format_generation_option_lines(options_from_job(job))
    repair_block = _repair_block(previous_error=previous_error, previous_answer=previous_answer)
    strategy_json = json.dumps(product_strategy.model_dump(), ensure_ascii=False, indent=2)
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

Product strategy to follow:
{strategy_json}

Source-grounded brief:
{source_brief}

Blueprint rules:
- Treat the OpenNotebook brief as the source of truth.
- Follow the product strategy exactly: same primary student, transformation, and final project.
- If the source contains several business models, select the strongest single path instead of mixing unrelated paths.
- Modules must be meaningful course folders with a clear progression toward the final project.
- The structure must maximize useful depth and clarity, not fit a fixed manual count.
- Prefer short, plain, result-oriented Russian titles; avoid unnecessary English terms in parentheses.
- Every module must create one visible piece of the final project.
- Every lesson needs a distinct learning_outcome, source_focus, student_deliverable, course_path_bridge, and media_placeholders.
- Every lesson deliverable must be a concrete artifact: checklist, script, table, worksheet, scorecard, map, plan, or diagnostic.
- Do not invent facts, names, numbers, tools, examples, or claims outside the brief.
- If source detail is thin, make the lesson deliverable a source-grounded diagnostic, checklist, or decision artifact.

JSON shape:
{{
  "transformation_goal": "student transformation in one concrete sentence",
  "target_student": "specific learner and their current context",
  "start_state": "what the learner has before the course",
  "end_state": "what the learner can do or has built after the course",
  "final_project": "one practical project assembled across all modules",
  "modules": [
    {{
      "title": "module folder title",
      "module_outcome": "what the learner can do after this module",
      "final_project_piece": "piece of the final project produced in this module",
      "lessons": [
        {{
          "title": "lesson title",
          "learning_outcome": "observable skill or decision",
          "student_deliverable": "artifact the student creates",
          "source_focus": "exact source themes this lesson must ask OpenNotebook about",
          "course_path_bridge": "how this lesson uses prior work or prepares the next lesson",
          "media_placeholders": [
            "SCREENSHOT: exact interface/state to show",
            "SCHEME: exact workflow/table/checklist to show"
          ]
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
    product_strategy: ProductCourseStrategyPayload,
) -> str:
    strategy_json = json.dumps(product_strategy.model_dump(), ensure_ascii=False, indent=2)
    return f"""
Extract the source-of-truth pack for one lesson in the course "{course_title}".

Use only the supplied OpenNotebook source context. Do not write the lesson.
Return valid JSON only. Do not wrap it in markdown fences.
If the source context does not support a requested detail, put it in source_gaps instead of inventing.

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
- Planned media placeholders: {", ".join(lesson.media_placeholders) or "none"}

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
    product_strategy: ProductCourseStrategyPayload,
    previous_error: str | None = None,
    previous_answer: str | None = None,
) -> str:
    source_pack_json = json.dumps(source_pack.model_dump(), ensure_ascii=False, indent=2)
    strategy_json = json.dumps(product_strategy.model_dump(), ensure_ascii=False, indent=2)
    repair_block = _repair_block(previous_error=previous_error, previous_answer=previous_answer)
    return f"""
Write one complete Karpix Skool lesson for the course "{course_title}".

Return valid JSON only. Do not wrap it in markdown fences.
Use only the lesson source pack as factual truth.
Do not add facts, names, numbers, tools, examples, links, or claims outside the source pack.
Do not include images, iframes, scripts, styles, or external media.

Language: Russian.

Product strategy:
{strategy_json}

Module:
- Title: {module.title}
- Outcome: {module.module_outcome}
- Final project piece: {module.final_project_piece}

Lesson blueprint:
- Title: {lesson.title}
- Learning outcome: {lesson.learning_outcome}
- Student deliverable: {lesson.student_deliverable}
- Source focus: {lesson.source_focus}
- Course path bridge: {lesson.course_path_bridge}
- Planned media placeholders: {", ".join(lesson.media_placeholders) or "none"}

Lesson source pack:
{source_pack_json}

Packaging rules:
- Write a complete course lesson, not a summary card.
- Use 4-6 course-specific <h2> sections with unique titles.
- Include at least 900 visible text characters.
- Include at least 6 separate <p>...</p> paragraphs in the html string; list items and headings do not count as paragraphs.
- Include at least one <ul> or <ol> with 3+ concrete checklist, script, or exercise items.
- Include one source-grounded example, case, script, diagnostic, or workflow.
- Make the lesson feel like one step in a larger paid course: reference the student artifact, how it will be used next, and the final project piece.
- Include at least one explicit inline media direction inside the html as a normal paragraph, using this format: <p><strong>Визуал:</strong> ...</p>.
- The visual direction must say exactly what to add: screenshot, scheme, table, checklist, or example screen, and where it belongs in the lesson.
- Also put the same concrete media ideas into media_plan.
- End with a concrete student deliverable and the next course step.
- Avoid the repeated generic pattern "Проблема / Что вы узнаете / Задание / Итог".

JSON shape:
{{
  "title": "{lesson.title}",
  "icon_emoji": "one relevant emoji",
  "html": "<h2>...</h2><p>...</p><ul><li>...</li></ul>",
  "media_plan": ["required exact media asset the admin should add"]
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
