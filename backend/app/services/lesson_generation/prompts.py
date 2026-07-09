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
- Every lesson must include one HTML visual direction:
  <p><strong>Визуал:</strong> describe the exact screenshot, image, diagram, table, checklist, or manual asset the admin should add.</p>
- Also put the same media idea into the lesson "media_plan" array.

JSON shape:
{{
  "lessons": [
    {{
      "title": "short lesson title",
      "icon_emoji": "one relevant emoji",
      "html": "<h2>...</h2><p>...</p><ul><li>...</li></ul>",
      "media_plan": ["required concrete media idea"]
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
Choose the course structure yourself from the source depth and the course goal.
Create as many modules and lessons as needed to explain the topic thoroughly.
Use up to {job.module_count} modules and up to {job.lessons_per_module} lessons per module.
Prefer fewer lessons only when the source is genuinely narrow.
Do not include images, iframe embeds, scripts, styles, or external media.

Language: Russian.

Course settings:
{option_lines}

Course packaging method:
- Build a packaged course product, not a list of summaries.
- Start from the final student outcome, then sequence modules as real milestones.
- Modules must feel like named folders in a complete curriculum: foundation, setup, execution, review, scaling, or another source-grounded progression.
- Lessons inside one module must not repeat the same frame; each lesson needs a distinct job, artifact, decision, or workflow.
- Use source-specific details in every lesson: names, processes, constraints, tools, examples, or numbers that appear in the source context.
- Do not invent facts, names, claims, metrics, links, tools, or examples outside the source context.
- If a detail is not in the source, write a concrete exercise around the available source material instead of filling with generic advice.
- Make the writing human, direct, practical, and specific.
- Avoid AI-like filler, motivational fluff, vague summaries, and repeated headings across lessons.

Media rule:
- Do not embed media.
- Every lesson must include one HTML visual direction:
  <p><strong>Визуал:</strong> describe the exact screenshot, image, diagram, table, checklist, or manual asset the admin should add.</p>
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
          "media_plan": ["required concrete media idea"]
        }}
      ]
    }}
  ]
}}

Each lesson HTML must be a complete lesson, not a card. Requirements:
- at least 900 characters of visible lesson text;
- 4-6 course-specific <h2> sections with unique titles;
- at least 6 short paragraphs;
- at least one <ul> or <ol> with 3+ concrete checklist, script, or exercise items;
- one source-grounded example, case, script, diagnostic, or workflow;
- one student deliverable at the end, phrased as a concrete artifact to create.

Do not use the same generic section pattern in every lesson. Avoid headings like "Проблема", "Что вы узнаете", "Пример успешного кейса", "Задание", "Итог" unless they are made specific to that lesson.
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
Choose the course structure yourself from the source depth and the course goal.
Create as many modules and lessons as needed to explain the topic thoroughly.
Use up to {job.module_count} modules and up to {job.lessons_per_module} lessons per module.
Prefer fewer lessons only when the source is genuinely narrow.
Do not include images, iframe embeds, scripts, styles, or external media.

Language: Russian.

Course settings:
{option_lines}

Source-grounded brief:
{source_brief}

Course packaging method:
- Build a packaged course product, not a list of summaries.
- Start from the final student outcome, then sequence modules as real milestones toward that outcome.
- Modules must feel like named folders in a complete curriculum: foundation, setup, execution, review, scaling, or another source-grounded progression.
- The structure must maximize useful depth and clarity, not fit a fixed manual count.
- Lessons inside one module must not repeat the same frame; each lesson needs a distinct job, artifact, decision, or workflow.
- Use brief-specific details in every lesson: names, processes, constraints, tools, examples, or numbers from the brief.
- Do not invent facts, names, claims, metrics, links, tools, or examples outside the brief.
- If a detail is not in the brief, write a concrete exercise around the available material instead of filling with generic advice.
- Make the writing human, direct, practical, and specific.
- Avoid AI-like filler, motivational fluff, vague summaries, and repeated headings across lessons.

Media rule:
- Do not embed media.
- Every lesson must include one HTML visual direction:
  <p><strong>Визуал:</strong> describe the exact screenshot, image, diagram, table, checklist, or manual asset the admin should add.</p>
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
          "media_plan": ["required concrete media idea"]
        }}
      ]
    }}
  ]
}}

Each lesson HTML must be a complete lesson, not a card. Requirements:
- at least 900 characters of visible lesson text;
- 4-6 course-specific <h2> sections with unique titles;
- at least 6 short paragraphs;
- at least one <ul> or <ol> with 3+ concrete checklist, script, or exercise items;
- one source-grounded example, case, script, diagnostic, or workflow;
- one student deliverable at the end, phrased as a concrete artifact to create.

Do not use the same generic section pattern in every lesson. Avoid headings like "Проблема", "Что вы узнаете", "Пример успешного кейса", "Задание", "Итог" unless they are made specific to that lesson.{repair_block}
""".strip()
