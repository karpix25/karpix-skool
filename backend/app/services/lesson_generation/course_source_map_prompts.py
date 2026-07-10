def build_course_source_map_prompt(
    *,
    course_title: str,
    source_brief: str,
    requested_modules: int,
    requested_lessons_per_module: int,
) -> str:
    """Ask the model to bound course scope before it designs the curriculum."""
    return f"""
Assess whether the supplied source can support a useful course named "{course_title}".

Return valid JSON only. Do not use markdown fences. Use only the source brief.
Do not invent missing concepts, procedures, examples, facts, or claims.
Language: Russian.

Requested upper bounds:
- modules: {requested_modules}
- lessons per module: {requested_lessons_per_module}

Source brief:
{source_brief}

Rules:
- Mark sufficiency as "sufficient" only when the source supports a coherent practical course.
- Mark it "partial" when a narrower course is viable and reduce the recommended counts.
- Mark it "insufficient" when no coherent practical course can be grounded in the source.
- Put missing material in source_gaps and topics that must not be taught in excluded_topics.
- Contradictions must be preserved, not silently resolved.

JSON shape:
{{
  "source_map": {{
    "confirmed_concepts": ["source-grounded concept"],
    "procedures": ["source-grounded procedure"],
    "examples": ["source-grounded example"],
    "constraints": ["claim or boundary the course must respect"],
    "contradictions": ["conflicting source positions"],
    "source_gaps": ["material needed but missing"],
    "excluded_topics": ["topic not supported by the source"],
    "recommended_module_count": 1,
    "recommended_lesson_count": 1,
    "sufficiency": "sufficient | partial | insufficient",
    "sufficiency_reason": "short source-grounded explanation"
  }}
}}
""".strip()
