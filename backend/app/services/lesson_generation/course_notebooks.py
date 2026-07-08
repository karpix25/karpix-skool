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
    return assign_course_open_notebook_id_value(course, notebook_id)


def assign_course_open_notebook_id_value(course: Course, notebook_id: Optional[str]) -> bool:
    if course_open_notebook_id(course):
        return False

    clean_notebook_id = (notebook_id or "").strip()
    if not clean_notebook_id:
        return False

    course.open_notebook_id = clean_notebook_id[:255]
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
