import uuid

from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile, status
from sqlmodel.ext.asyncio.session import AsyncSession

from ..db import get_session
from ..models import User
from ..models_generation import CourseStructureGenerationJob
from ..routes.auth import get_current_user
from ..schemas.generation_sources import GenerationSourceUploadRead
from ..schemas.lesson_generation import CourseStructureGenerationCreate, CourseStructureGenerationJobRead
from ..services.generation_source_uploads import upload_generation_source_file
from ..services.lesson_generation.course_structure_jobs import (
    create_course_structure_generation_job,
    get_latest_course_structure_generation_job,
)
from ..utils.security import ensure_tenant_access, get_managed_course

router = APIRouter()


@router.post(
    "/{course_id}/structure-generation-jobs",
    response_model=CourseStructureGenerationJobRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_course_structure_job(
    request: CourseStructureGenerationCreate,
    course=Depends(get_managed_course),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    return await create_course_structure_generation_job(
        session=session,
        course=course,
        current_user=current_user,
        request=request,
    )


@router.get(
    "/{course_id}/structure-generation-jobs/latest",
    response_model=CourseStructureGenerationJobRead | None,
)
async def get_latest_course_structure_job(
    course=Depends(get_managed_course),
    session: AsyncSession = Depends(get_session),
):
    return await get_latest_course_structure_generation_job(session=session, course=course)


@router.post(
    "/{course_id}/generation-source-files",
    response_model=GenerationSourceUploadRead,
    status_code=status.HTTP_201_CREATED,
)
async def upload_course_generation_source_file(
    request: Request,
    file: UploadFile = File(...),
    course=Depends(get_managed_course),
):
    return await upload_generation_source_file(
        request=request,
        file=file,
        folder=f"generation-sources/{course.tenant_id}/{course.id}",
    )


@router.get("/structure-generation-jobs/{job_id}", response_model=CourseStructureGenerationJobRead)
async def get_course_structure_job(
    job_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    job = await session.get(CourseStructureGenerationJob, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Course structure generation job not found")

    await ensure_tenant_access(job.tenant_id, current_user, session)
    return job
