from dataclasses import dataclass
from typing import Any, Optional


@dataclass(frozen=True)
class CourseGenerationOptions:
    audience_level: Optional[str] = None
    style: Optional[str] = None
    course_goal: Optional[str] = None
    target_audience: Optional[str] = None
    lesson_format: Optional[str] = None
    depth: Optional[str] = None
    practice_level: Optional[str] = None
    media_strategy: Optional[str] = None
    monetization_strategy: Optional[str] = None


def options_from_job(job: Any) -> CourseGenerationOptions:
    request_json = job.request_json if isinstance(getattr(job, "request_json", None), dict) else {}
    return CourseGenerationOptions(
        audience_level=_text(getattr(job, "audience_level", None) or request_json.get("audience_level")),
        style=_text(getattr(job, "style", None) or request_json.get("style")),
        course_goal=_text(request_json.get("course_goal")),
        target_audience=_text(request_json.get("target_audience")),
        lesson_format=_text(request_json.get("lesson_format")),
        depth=_text(request_json.get("depth")),
        practice_level=_text(request_json.get("practice_level")),
        media_strategy=_text(request_json.get("media_strategy")),
        monetization_strategy=_text(request_json.get("monetization_strategy")),
    )


def format_generation_option_lines(options: CourseGenerationOptions) -> str:
    rows = [
        ("Audience level", options.audience_level),
        ("Target audience", options.target_audience),
        ("Course goal", options.course_goal),
        ("Lesson format", options.lesson_format),
        ("Depth", options.depth),
        ("Practice level", options.practice_level),
        ("Writing style", options.style),
        ("Media strategy", options.media_strategy),
        ("Free/VIP strategy", options.monetization_strategy),
    ]
    lines = [f"- {label}: {value}" for label, value in rows if value]
    return "\n".join(lines) if lines else "- Audience level: not specified"


def _text(value: Any) -> Optional[str]:
    if not isinstance(value, str):
        return None
    stripped = value.strip()
    return stripped or None
