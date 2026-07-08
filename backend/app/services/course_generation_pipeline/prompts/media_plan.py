from dataclasses import dataclass

from .shared import FACT_BOUNDARY, JSON_ONLY, numbered_lines, optional_lines


@dataclass(frozen=True)
class MediaPlanPromptInput:
    course_title: str
    lesson_titles: list[str]
    audience: str | None = None
    style: str | None = None


def build_media_plan_prompt(params: MediaPlanPromptInput) -> str:
    metadata = optional_lines(Audience=params.audience, Style=params.style)
    metadata_block = f"\n{metadata}\n" if metadata else "\n"
    lessons = numbered_lines(params.lesson_titles)

    return f"""
Create a practical media plan for a Karpix Skool course.
{metadata_block}
Course: {params.course_title}
Lessons:
{lessons}

{FACT_BOUNDARY}
{JSON_ONLY}

Planning rules:
- Recommend media only where it improves learning or review.
- Do not invent visuals, screenshots, statistics, product screens, or demonstrations that are not
  grounded in the Open Notebook source context.
- For source-backed visuals, describe what the admin should capture, draw, or upload.
- If no useful media is needed for a lesson, use media_type "none" and explain why.
- Keep every instruction actionable for a course admin.

Language: Russian.

JSON shape:
{{
  "items": [
    {{
      "lesson_title": "lesson title",
      "media_type": "screenshot|diagram|short_video|file|none",
      "purpose": "why this media helps the learner",
      "instruction": "what the admin should create or attach",
      "source_basis": "which source-backed idea supports this media"
    }}
  ]
}}
""".strip()
