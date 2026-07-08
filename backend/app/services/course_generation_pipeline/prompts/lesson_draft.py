from dataclasses import dataclass

from .shared import FACT_BOUNDARY, JSON_ONLY, optional_lines


@dataclass(frozen=True)
class LessonDraftPromptInput:
    course_title: str
    module_title: str
    lesson_title: str
    learning_outcome: str
    audience: str | None = None
    style: str | None = None


def build_lesson_draft_prompt(params: LessonDraftPromptInput) -> str:
    metadata = optional_lines(Audience=params.audience, Style=params.style)
    metadata_block = f"\n{metadata}\n" if metadata else "\n"

    return f"""
Create one Karpix Skool lesson draft from the Open Notebook source context.
{metadata_block}
Course: {params.course_title}
Module: {params.module_title}
Lesson: {params.lesson_title}
Learning outcome: {params.learning_outcome}

{FACT_BOUNDARY}
{JSON_ONLY}

Drafting rules:
- Teach through a concrete learner task, not a generic article.
- Use the lesson outcome as the spine: intro, explanation, example, practice, takeaway.
- Do not add screenshots, videos, iframes, scripts, styles, or external links.
- If a needed factual detail is missing from the source context, add a short admin note in the HTML
  instead of inventing it.
- Keep the tone clear, practical, and suitable for the stated audience.

Language: Russian.

JSON shape:
{{
  "title": "lesson title",
  "learning_outcome": "observable outcome",
  "html": "<h2>...</h2><p>...</p><ul><li>...</li></ul>",
  "practice_task": "short student task",
  "source_gaps": ["missing source detail, if any"]
}}
""".strip()
