from datetime import datetime
from typing import Any, Optional

from ...models import Course


def course_open_notebook_id(course: Course) -> Optional[str]:
    notebook_id = (course.open_notebook_id or "").strip()
    return notebook_id or None


def assign_course_open_notebook_id(course: Course, source_response: Optional[dict[str, Any]]) -> bool:
    if course_open_notebook_id(course):
        return False

    notebook_id = _source_notebook_id(source_response)
    if not notebook_id:
        return False

    course.open_notebook_id = notebook_id[:255]
    course.updated_at = datetime.utcnow()
    return True


def _source_notebook_id(source_response: Optional[dict[str, Any]]) -> Optional[str]:
    if not isinstance(source_response, dict):
        return None

    notebook_id = source_response.get("notebook_id")
    if not isinstance(notebook_id, str):
        return None

    notebook_id = notebook_id.strip()
    return notebook_id or None
