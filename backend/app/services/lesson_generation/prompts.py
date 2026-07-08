from ...models_generation import CourseStructureGenerationJob, LessonGenerationJob
from .course_generation_options import format_generation_option_lines, options_from_job


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
