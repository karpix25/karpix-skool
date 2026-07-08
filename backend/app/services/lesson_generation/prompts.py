from ...models_generation import CourseStructureGenerationJob, LessonGenerationJob
from .course_generation_options import format_generation_option_lines, options_from_job


def build_source_course_brief_prompt(job: CourseStructureGenerationJob, course_title: str) -> str:
    option_lines = format_generation_option_lines(options_from_job(job))
    return f"""
Read the supplied Open Notebook source context and create a source-grounded course brief for "{course_title}".

Return plain text only. Do not return JSON. Do not wrap the answer in markdown fences.
Use only the supplied source context. Do not invent facts, names, metrics, tools, links, or examples.
If the source does not contain enough information for a course, say that clearly in one sentence.

Language: Russian.

Course settings:
{option_lines}

Brief structure:
1. Главная трансформация ученика
2. Ключевые темы из источников
3. Факты, имена, инструменты и примеры, которые можно использовать
4. Практические шаги или процессы
5. Предлагаемая логика модулей и уроков
6. Что нельзя утверждать без дополнительных источников

Keep the brief dense and practical. Prefer concrete source details over broad summaries.
""".strip()


def build_source_lesson_prompt(job: LessonGenerationJob, module_title: str) -> str:
    option_lines = format_generation_option_lines(options_from_job(job))
    return f"""
Create {job.lesson_count} structured LMS lesson drafts for the module "{module_title}".

Use only the Open Notebook source context supplied with this task.
Return valid JSON only. Do not wrap it in markdown fences.
Do not include images, iframe embeds, scripts, styles, or external media.

Language: Russian.

Course settings:
{option_lines}

Instructional method:
- Use a practical transformation-first structure: each lesson must move the student toward a concrete skill.
- Start from the result, then explain only what the student needs to do the task.
- Follow a simple Merrill-style flow: problem -> activation -> demonstration -> application -> integration.
- Sound like a strong human course author, not like a generic AI summary.
- Do not invent facts, metrics, names, claims, tools, or examples that are not grounded in the source context.
- If a factual detail is missing, write around it without pretending certainty.
- Keep paragraphs short and concrete.

Media rule:
- Do not embed media.
- If visual support would help, add one HTML note:
  <p><strong>Место для медиа:</strong> describe the exact screenshot, image, diagram, or manual asset the admin should add.</p>
- Also put the same media idea into the lesson "media_plan" array.

JSON shape:
{{
  "lessons": [
    {{
      "title": "short lesson title",
      "icon_emoji": "one relevant emoji",
      "html": "<h2>...</h2><p>...</p><ul><li>...</li></ul>",
      "media_plan": ["optional concrete media idea"]
    }}
  ]
}}

Each lesson HTML must include:
- a short hook that names the practical problem;
- what the student will learn;
- 2-4 <h2> sections with clear explanation;
- an example or practical scenario from the source context;
- a short checklist or task;
- a concise final takeaway.
""".strip()


def build_source_course_structure_prompt(job: CourseStructureGenerationJob, course_title: str) -> str:
    option_lines = format_generation_option_lines(options_from_job(job))
    return f"""
Create a complete LMS course draft for the course "{course_title}".

Use only the Open Notebook source context supplied with this task.
Return valid JSON only. Do not wrap it in markdown fences.
Create exactly {job.module_count} modules. Each module must contain up to {job.lessons_per_module} lessons.
Do not include images, iframe embeds, scripts, styles, or external media.

Language: Russian.

Course settings:
{option_lines}

Course design method:
- Design the course around a concrete student transformation, not topic coverage.
- Use backward design: define the final skill first, then sequence modules as milestones toward that skill.
- Use Merrill's flow inside lessons: problem -> activation -> demonstration -> application -> integration.
- Modules should feel like meaningful chapters/folders, not technical buckets.
- Lessons should be useful on their own, but together form a clear path.
- For free/VIP strategy, mark premium depth in the text only as a suggestion when relevant; do not lock content in HTML.
- Do not invent facts, names, claims, metrics, links, tools, or examples outside the source context.
- Make the writing human, direct, practical, and specific.
- Avoid AI-like filler, motivational fluff, and vague summaries.

Media rule:
- Do not embed media.
- If visual support would help, add one HTML note:
  <p><strong>Место для медиа:</strong> describe the exact screenshot, image, diagram, or manual asset the admin should add.</p>
- Also put the same media idea into the lesson "media_plan" array.

JSON shape:
{{
  "modules": [
    {{
      "title": "short module folder title",
      "lessons": [
        {{
          "title": "short lesson title",
          "icon_emoji": "one relevant emoji",
          "html": "<h2>...</h2><p>...</p><ul><li>...</li></ul>",
          "media_plan": ["optional concrete media idea"]
        }}
      ]
    }}
  ]
}}

Each lesson HTML must include:
- a short hook that names the practical problem;
- what the student will learn;
- 2-4 <h2> sections with clear explanation;
- an example or practical scenario from the source context;
- a short checklist or task;
- a concise final takeaway.
""".strip()


def build_course_structure_from_brief_prompt(
    *,
    job: CourseStructureGenerationJob,
    course_title: str,
    source_brief: str,
    previous_error: str | None = None,
    previous_answer: str | None = None,
) -> str:
    option_lines = format_generation_option_lines(options_from_job(job))
    repair_block = ""
    if previous_error or previous_answer:
        repair_block = f"""

Previous output was rejected.
Error: {previous_error or "unknown"}
Rejected output:
{(previous_answer or "")[:4000]}

Return a corrected complete JSON object now.
""".rstrip()

    return f"""
Create a complete LMS course draft for the course "{course_title}" from this source-grounded brief.

Return valid JSON only. Do not wrap it in markdown fences.
Create exactly {job.module_count} modules. Each module must contain up to {job.lessons_per_module} lessons.
Do not include images, iframe embeds, scripts, styles, or external media.

Language: Russian.

Course settings:
{option_lines}

Source-grounded brief:
{source_brief}

Course design method:
- Design the course around a concrete student transformation, not topic coverage.
- Use backward design: define the final skill first, then sequence modules as milestones toward that skill.
- Lessons should be useful on their own, but together form a clear path.
- Do not invent facts, names, claims, metrics, links, tools, or examples outside the brief.
- Make the writing human, direct, practical, and specific.

Media rule:
- Do not embed media.
- If visual support would help, add one HTML note:
  <p><strong>Место для медиа:</strong> describe the exact screenshot, image, diagram, or manual asset the admin should add.</p>
- Also put the same media idea into the lesson "media_plan" array.

JSON shape:
{{
  "modules": [
    {{
      "title": "short module folder title",
      "lessons": [
        {{
          "title": "short lesson title",
          "icon_emoji": "one relevant emoji",
          "html": "<h2>...</h2><p>...</p><ul><li>...</li></ul>",
          "media_plan": ["optional concrete media idea"]
        }}
      ]
    }}
  ]
}}

Each lesson HTML must include:
- a short hook that names the practical problem;
- what the student will learn;
- 2-4 <h2> sections with clear explanation;
- an example or practical scenario from the brief;
- a short checklist or task;
- a concise final takeaway.{repair_block}
""".strip()
