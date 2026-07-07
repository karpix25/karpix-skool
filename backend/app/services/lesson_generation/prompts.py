from ...models_generation import CourseStructureGenerationJob, LessonGenerationJob


def build_notebooklm_lesson_prompt(job: LessonGenerationJob, module_title: str) -> str:
    level_line = f"\nAudience level: {job.audience_level}" if job.audience_level else ""
    style_line = f"\nWriting style: {job.style}" if job.style else ""
    return f"""
Create {job.lesson_count} structured LMS lesson drafts for the module "{module_title}".

Use only the sources in this NotebookLM notebook.
Return valid JSON only. Do not wrap it in markdown fences.
Do not include images, iframe embeds, scripts, styles, or external media.
If a lesson needs a screenshot, place a text note in the HTML:
<p><strong>Место для скриншота:</strong> explain exactly what the admin should add.</p>

Language: Russian.
{level_line}{style_line}

JSON shape:
{{
  "lessons": [
    {{
      "title": "short lesson title",
      "icon_emoji": "one relevant emoji",
      "html": "<h2>...</h2><p>...</p><ul><li>...</li></ul>"
    }}
  ]
}}

Each lesson HTML must include:
- a clear introduction;
- 2-4 <h2> sections;
- examples or a practical scenario;
- a short checklist or practical task;
    - a concise final takeaway.
    """.strip()


def build_notebooklm_course_structure_prompt(job: CourseStructureGenerationJob, course_title: str) -> str:
    level_line = f"\nAudience level: {job.audience_level}" if job.audience_level else ""
    style_line = f"\nWriting style: {job.style}" if job.style else ""
    return f"""
Create a structured LMS course plan for the course "{course_title}".

Use only the sources in this NotebookLM notebook.
Return valid JSON only. Do not wrap it in markdown fences.
Create exactly {job.module_count} modules. Each module must contain up to {job.lessons_per_module} lessons.
Do not include images, iframe embeds, scripts, styles, or external media.
If a lesson needs a screenshot, place a text note in the HTML:
<p><strong>Место для скриншота:</strong> explain exactly what the admin should add.</p>

Language: Russian.
{level_line}{style_line}

JSON shape:
{{
  "modules": [
    {{
      "title": "short module folder title",
      "lessons": [
        {{
          "title": "short lesson title",
          "icon_emoji": "one relevant emoji",
          "html": "<h2>...</h2><p>...</p><ul><li>...</li></ul>"
        }}
      ]
    }}
  ]
}}

Each lesson HTML must include:
- a clear introduction;
- 2-4 <h2> sections;
- examples or a practical scenario;
- a short checklist or practical task;
- a concise final takeaway.
""".strip()
