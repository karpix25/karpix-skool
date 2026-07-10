from html import escape

from ...schemas.lesson_generation import GeneratedLessonPayload
from .course_structure_quality import has_course_path_bridge


MAX_LESSON_HTML_CHARS = 30000


def ensure_course_path_bridge(
    lesson: GeneratedLessonPayload,
    *,
    bridge: str,
) -> tuple[GeneratedLessonPayload, bool]:
    """Append the blueprint bridge when an otherwise valid lesson omitted it."""
    if has_course_path_bridge(lesson.html):
        return lesson, False

    bridge_text = bridge.strip()
    if not bridge_text:
        return lesson, False

    paragraph = (
        '<p><strong>Следующий шаг:</strong> На следующем шаге '
        f'{escape(bridge_text)}</p>'
    )
    repaired_html = f"{lesson.html.rstrip()}\n{paragraph}"
    if len(repaired_html) > MAX_LESSON_HTML_CHARS:
        return lesson, False

    repaired = GeneratedLessonPayload.model_validate(
        {**lesson.model_dump(), "html": repaired_html}
    )
    return repaired, True
