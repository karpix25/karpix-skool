from typing import List

from fastapi import APIRouter

from . import course_lessons, course_modules, course_reorder, course_routes, course_structure_generation, lesson_generation
from ..schemas.courses import CourseRead

router = APIRouter()

router.add_api_route("", course_routes.create_course, methods=["POST"], response_model=CourseRead, include_in_schema=False)
router.add_api_route("", course_routes.list_courses, methods=["GET"], response_model=List[CourseRead], include_in_schema=False)
router.include_router(course_routes.router)
router.include_router(course_structure_generation.router)
router.include_router(course_modules.router)
router.include_router(course_lessons.router)
router.include_router(lesson_generation.router)
router.include_router(course_reorder.router)
