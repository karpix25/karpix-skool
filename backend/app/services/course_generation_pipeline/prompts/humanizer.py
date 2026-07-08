from dataclasses import dataclass

from .shared import JSON_ONLY, optional_lines


@dataclass(frozen=True)
class HumanizerPromptInput:
    title: str
    draft_html: str
    audience: str | None = None
    style: str | None = None


def build_humanizer_prompt(params: HumanizerPromptInput) -> str:
    metadata = optional_lines(Audience=params.audience, Style=params.style)
    metadata_block = f"\n{metadata}\n" if metadata else "\n"

    return f"""
Humanize this Karpix Skool lesson draft without changing its factual content.
{metadata_block}
Lesson: {params.title}

Hard boundary:
- Do not add facts.
- Do not introduce new examples, numbers, names, product details, links, claims, or source references.
- Do not remove factual claims from the draft.
- Only improve clarity, rhythm, transitions, friendliness, and reading flow.
- Preserve HTML structure where practical and keep the output safe for an LMS editor.

{JSON_ONLY}
Language: Russian.

Draft HTML:
{params.draft_html}

JSON shape:
{{
  "title": "lesson title",
  "html": "<h2>...</h2><p>...</p>",
  "change_notes": ["brief note about style-only edits"]
}}
""".strip()
