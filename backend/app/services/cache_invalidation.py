import uuid
from collections.abc import Iterable

from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from ..models import Course, Lesson, Module
from ..utils.cache import clear_cache

CACHE_PREFIX = "cache"
WEBAPP_COURSES_PATH = "/webapp/courses"
WEBAPP_LEADERBOARD_PATH = "/webapp/leaderboard"


def route_cache_pattern(path: str) -> str:
    return f"{CACHE_PREFIX}:{path}:*"


def leaderboard_cache_patterns(tenant_id: uuid.UUID | None = None) -> list[str]:
    return [route_cache_pattern(WEBAPP_LEADERBOARD_PATH)]


def course_cache_patterns(course_id: uuid.UUID | str) -> list[str]:
    return [
        route_cache_pattern(WEBAPP_COURSES_PATH),
        route_cache_pattern(f"{WEBAPP_COURSES_PATH}/{course_id}"),
    ]


def tenant_cache_patterns(tenant_id: uuid.UUID | str) -> list[str]:
    return [
        route_cache_pattern(WEBAPP_COURSES_PATH),
        *leaderboard_cache_patterns(),
    ]


def user_cache_patterns(user_id: uuid.UUID | str) -> list[str]:
    return [
        route_cache_pattern(WEBAPP_COURSES_PATH),
        route_cache_pattern(f"{WEBAPP_COURSES_PATH}/*"),
        *leaderboard_cache_patterns(),
    ]


async def invalidate_cache_patterns(patterns: Iterable[str]) -> None:
    for pattern in dict.fromkeys(patterns):
        await clear_cache(pattern)


async def invalidate_lesson_completion_caches(
    *,
    course_id: uuid.UUID,
    tenant_id: uuid.UUID,
    user_id: uuid.UUID,
) -> None:
    await invalidate_cache_patterns(
        [
            *course_cache_patterns(course_id),
            *tenant_cache_patterns(tenant_id),
            *user_cache_patterns(user_id),
        ]
    )


async def invalidate_course_write_caches(
    *,
    course_id: uuid.UUID,
    tenant_id: uuid.UUID,
) -> None:
    await invalidate_cache_patterns(
        [
            *course_cache_patterns(course_id),
            *tenant_cache_patterns(tenant_id),
        ]
    )


async def invalidate_lesson_content_caches(
    session: AsyncSession,
    lesson_id: uuid.UUID,
) -> None:
    stmt = (
        select(Course.id, Course.tenant_id)
        .join(Module, Module.course_id == Course.id)
        .join(Lesson, Lesson.module_id == Module.id)
        .where(Lesson.id == lesson_id)
    )
    result = await session.exec(stmt)
    scope = result.first()
    if scope:
        course_id, tenant_id = scope
        await invalidate_course_write_caches(course_id=course_id, tenant_id=tenant_id)
