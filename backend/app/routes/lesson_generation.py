import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel.ext.asyncio.session import AsyncSession

from ..db import get_session
from ..models import Course, Module, User
from ..models_generation import LessonGenerationJob
from ..routes.auth import get_current_user
from ..schemas.lesson_generation import LessonGenerationCreate, LessonGenerationJobRead
from ..services.lesson_generation.jobs import create_lesson_generation_job
from ..utils.security import ensure_tenant_access, get_managed_module

router = APIRouter()


@router.post(
    "/modules/{module_id}/lesson-generation-jobs",
    response_model=LessonGenerationJobRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_module_lesson_generation_job(
    request: LessonGenerationCreate,
    module: Module = Depends(get_managed_module),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    course = await session.get(Course, module.course_id)
    if not course or course.deleted_at:
        raise HTTPException(status_code=404, detail="Course context not found")

    return await create_lesson_generation_job(
        session=session,
        module=module,
        course=course,
        current_user=current_user,
        request=request,
    )


@router.get("/lesson-generation-jobs/{job_id}", response_model=LessonGenerationJobRead)
async def get_lesson_generation_job(
    job_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    job = await session.get(LessonGenerationJob, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Lesson generation job not found")

    await ensure_tenant_access(job.tenant_id, current_user, session)
    return job
