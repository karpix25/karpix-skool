import uuid

from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile, status
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from ..db import get_session
from ..models import User
from ..models_generation import CourseStructureGenerationJob, CourseStructureLessonTask
from ..routes.auth import get_current_user
from ..schemas.generation_sources import GenerationSourceUploadRead
from ..schemas.lesson_generation import (
    CourseStructureGenerationCreate,
    CourseStructureGenerationJobRead,
    CourseStructureGenerationResumeRequest,
    CourseStructureGenerationResumeResponse,
    CourseStructureLessonTaskRead,
)
from ..services.generation_source_uploads import upload_generation_source_file
from ..services.lesson_generation.course_structure_jobs import (
    create_course_structure_generation_job,
    get_latest_course_structure_generation_job,
)
from ..services.lesson_generation.course_structure_resume import resume_course_structure_job
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
    try:
        return await create_course_structure_generation_job(
            session=session,
            course=course,
            current_user=current_user,
            request=request,
        )
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc


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


@router.post(
    "/structure-generation-jobs/{job_id}/resume",
    response_model=CourseStructureGenerationResumeResponse,
)
async def resume_course_structure_generation_job(
    job_id: uuid.UUID,
    request: CourseStructureGenerationResumeRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    job = await _get_accessible_job(job_id, current_user, session)
    if not CourseStructureGenerationJobRead.model_validate(job).can_resume:
        raise HTTPException(status_code=409, detail="Course structure generation job cannot be resumed")

    result = await resume_course_structure_job(
        session,
        job,
        include_source_gaps=request.include_source_gaps,
    )
    if result.resumed_task_count == 0 and result.had_lesson_tasks:
        await session.rollback()
        raise HTTPException(status_code=409, detail="Course structure generation job has no resumable lessons")
    await session.commit()
    await session.refresh(job)
    return {
        **CourseStructureGenerationJobRead.model_validate(job).model_dump(),
        "resumed_task_count": result.resumed_task_count,
        "included_source_gaps": result.included_source_gaps,
    }


@router.get(
    "/structure-generation-jobs/{job_id}/lessons",
    response_model=list[CourseStructureLessonTaskRead],
)
async def get_course_structure_generation_lessons(
    job_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    await _get_accessible_job(job_id, current_user, session)
    statement = (
        select(CourseStructureLessonTask)
        .where(CourseStructureLessonTask.job_id == job_id)
        .order_by(CourseStructureLessonTask.order_index.asc())
    )
    return (await session.exec(statement)).all()


async def _get_accessible_job(
    job_id: uuid.UUID,
    current_user: User,
    session: AsyncSession,
) -> CourseStructureGenerationJob:
    job = await session.get(CourseStructureGenerationJob, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Course structure generation job not found")
    await ensure_tenant_access(job.tenant_id, current_user, session)
    return job
