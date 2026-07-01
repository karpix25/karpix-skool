from fastapi import APIRouter

from . import course_lessons, course_modules, course_reorder, course_routes

router = APIRouter()
router.include_router(course_routes.router)
router.include_router(course_modules.router)
router.include_router(course_lessons.router)
router.include_router(course_reorder.router)
