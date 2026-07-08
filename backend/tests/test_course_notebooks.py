import uuid

from app.models import Course
from app.services.lesson_generation.course_notebooks import (
    assign_course_open_notebook_id,
    course_open_notebook_id,
)


def test_course_open_notebook_id_strips_blank_values():
    course = Course(id=uuid.uuid4(), tenant_id=uuid.uuid4(), title="Course", open_notebook_id="  ")

    assert course_open_notebook_id(course) is None


def test_assign_course_open_notebook_id_from_source_response():
    course = Course(id=uuid.uuid4(), tenant_id=uuid.uuid4(), title="Course")

    assigned = assign_course_open_notebook_id(course, {"notebook_id": " notebook:course "})

    assert assigned is True
    assert course.open_notebook_id == "notebook:course"
    assert course.updated_at is not None


def test_assign_course_open_notebook_id_keeps_existing_course_notebook():
    course = Course(
        id=uuid.uuid4(),
        tenant_id=uuid.uuid4(),
        title="Course",
        open_notebook_id="notebook:existing",
    )

    assigned = assign_course_open_notebook_id(course, {"notebook_id": "notebook:new"})

    assert assigned is False
    assert course.open_notebook_id == "notebook:existing"
