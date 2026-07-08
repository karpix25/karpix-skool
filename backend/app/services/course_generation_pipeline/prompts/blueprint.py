from dataclasses import dataclass

from .shared import FACT_BOUNDARY, JSON_ONLY, optional_lines


@dataclass(frozen=True)
class CourseBlueprintPromptInput:
    course_title: str
    module_count: int
    lessons_per_module: int
    audience: str | None = None
    transformation_goal: str | None = None
    style: str | None = None


def build_course_blueprint_prompt(params: CourseBlueprintPromptInput) -> str:
    metadata = optional_lines(
        Audience=params.audience,
        Transformation_goal=params.transformation_goal,
        Style=params.style,
    )
    metadata_block = f"\n{metadata}\n" if metadata else "\n"

    return f"""
Design a Karpix Skool course blueprint for "{params.course_title}".
{metadata_block}
{FACT_BOUNDARY}
{JSON_ONLY}

Methodology:
- Start with the learner transformation, then use backward design to define evidence of success.
- Organize the course as a practical progression from current state to target capability.
- Each module must unlock one observable capability that supports the transformation.
- Each lesson must follow Merrill's First Principles: real problem, activation, demonstration,
  application, and integration.
- If the source context does not support a useful lesson, mark the gap instead of inventing facts.

Create exactly {params.module_count} modules.
Create up to {params.lessons_per_module} lessons per module.
Language: Russian.

JSON shape:
{{
  "course_title": "course title",
  "transformation_goal": "observable target state for the learner",
  "modules": [
    {{
      "title": "module title",
      "transformation_outcome": "what the learner can do after this module",
      "evidence_of_success": "how the admin can tell the learner achieved it",
      "lessons": [
        {{
          "title": "lesson title",
          "learning_outcome": "observable lesson outcome",
          "merrill_task": "real task or problem used to teach the lesson",
          "source_gap": null
        }}
      ]
    }}
  ]
}}
""".strip()
