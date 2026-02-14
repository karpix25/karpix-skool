from fastapi import APIRouter, Depends, HTTPException
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlmodel import select
from typing import List, Optional
import uuid
from pydantic import BaseModel
from ..db import get_session
from ..models import Course, Module, Lesson, User, UnlockType, VideoProvider, CourseUnlockType, LessonProgress
from .auth import get_current_user
from ..utils.security import get_managed_course, get_managed_module, get_managed_lesson
from ..utils.tenant import get_active_tenant_id

router = APIRouter()

# --- Pydantic Models for Input/Output ---

class CourseCreate(BaseModel):
    title: str
    description: Optional[str] = None
    cover_url: Optional[str] = None
    unlock_value: Optional[str] = None
    is_published: bool = False
    is_vip: bool = False
    unlock_type: CourseUnlockType = CourseUnlockType.open

class CourseUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    cover_url: Optional[str] = None
    unlock_value: Optional[str] = None
    is_published: Optional[bool] = None
    is_vip: Optional[bool] = None
    unlock_type: Optional[CourseUnlockType] = None

class CourseRead(BaseModel):
    id: uuid.UUID
    title: str
    description: Optional[str]
    cover_url: Optional[str]
    unlock_value: Optional[str]
    is_published: bool
    is_vip: bool
    unlock_type: CourseUnlockType
    progress_percent: int = 0
    order_index: int = 0
    tenant_id: uuid.UUID

class ModuleCreate(BaseModel):
    title: str
    unlock_value: Optional[str] = None
    order_index: int = 0
    is_vip: bool = False
    unlock_type: UnlockType = UnlockType.immediate

class ModuleRead(BaseModel):
    id: uuid.UUID
    title: str
    unlock_value: Optional[str]
    order_index: int
    is_vip: bool
    unlock_type: UnlockType
    course_id: uuid.UUID

class ModuleUpdate(BaseModel):
    title: Optional[str] = None
    unlock_value: Optional[str] = None
    order_index: Optional[int] = None
    is_vip: Optional[bool] = None
    unlock_type: Optional[UnlockType] = None

class LessonCreate(BaseModel):
    title: str
    video_provider: Optional[VideoProvider] = None
    video_id: Optional[str] = None
    content: Optional[str] = None
    order_index: int = 0
    is_published: bool = False
    is_vip: bool = False
    unlock_type: UnlockType = UnlockType.immediate
    unlock_value: Optional[str] = None

class LessonRead(BaseModel):
    id: uuid.UUID
    title: str
    video_provider: Optional[VideoProvider] = None
    video_id: Optional[str] = None
    content: Optional[str]
    order_index: int
    is_published: bool
    is_vip: bool
    unlock_type: UnlockType
    unlock_value: Optional[str]
    module_id: uuid.UUID
    mux_asset_id: Optional[str] = None
    mux_playback_id: Optional[str] = None
    mux_status: Optional[str] = None

class LessonUpdate(BaseModel):
    title: Optional[str] = None
    video_provider: Optional[VideoProvider] = None
    video_id: Optional[str] = None
    content: Optional[str] = None
    order_index: Optional[int] = None
    is_published: Optional[bool] = None
    is_vip: Optional[bool] = None
    unlock_type: Optional[UnlockType] = None
    unlock_value: Optional[str] = None
    module_id: Optional[uuid.UUID] = None
    mux_asset_id: Optional[str] = None
    mux_playback_id: Optional[str] = None
    mux_status: Optional[str] = None

class ModuleDetailRead(ModuleRead):
    lessons: List[LessonRead]

class CourseDetailRead(BaseModel):
    course: CourseRead
    modules: List[ModuleDetailRead]

# --- Course Endpoints ---

@router.post("", response_model=CourseRead)
async def create_course(
    course_in: CourseCreate,
    tenant_id: uuid.UUID = Depends(get_active_tenant_id),
    session: AsyncSession = Depends(get_session)
):
    new_course = Course(
        title=course_in.title,
        description=course_in.description,
        cover_url=course_in.cover_url,
        unlock_type=course_in.unlock_type,
        unlock_value=course_in.unlock_value,
        is_published=course_in.is_published,
        tenant_id=tenant_id
    )
    session.add(new_course)
    await session.commit()
    await session.refresh(new_course)
    return new_course

async def get_courses_with_progress(courses: List[Course], current_user: User, session: AsyncSession):
    # Get all completed lessons for this user to calculate progress
    stmt_p = select(LessonProgress).where(LessonProgress.user_id == current_user.id)
    res_p = await session.exec(stmt_p)
    completed_lesson_ids = {p.lesson_id for p in res_p.all()}

    output = []
    for c in courses:
        # Get all lessons for this course
        stmt_l = select(Lesson).join(Module).where(Module.course_id == c.id)
        res_l = await session.exec(stmt_l)
        all_lessons = res_l.all()
        
        total = len(all_lessons)
        completed = sum(1 for l in all_lessons if l.id in completed_lesson_ids)
        
        c_dict = c.dict()
        c_dict["progress_percent"] = int((completed / total) * 100) if total > 0 else 0
        output.append(c_dict)
    return output

@router.get("", response_model=List[CourseRead])
async def list_courses(
    current_user: User = Depends(get_current_user),
    tenant_id: uuid.UUID = Depends(get_active_tenant_id),
    session: AsyncSession = Depends(get_session)
):
    # Fetch courses for the active tenant
    stmt = select(Course).where(Course.tenant_id == tenant_id)
    result = await session.exec(stmt)
    courses = result.all()
    return await get_courses_with_progress(courses, current_user, session)

@router.get("/{course_id}", response_model=CourseRead)
async def get_course(
    course: Course = Depends(get_managed_course)
):
    return course

@router.get("/{course_id}/edit", response_model=CourseDetailRead)
async def get_course_editor_data(
    course: Course = Depends(get_managed_course),
    session: AsyncSession = Depends(get_session)
):
    course_id = course.id
    
    # Fetch modules
    stmt_m = select(Module).where(Module.course_id == course_id).order_by(Module.order_index)
    res_m = await session.exec(stmt_m)
    modules = res_m.all()
    
    modules_detail = []
    for m in modules:
        stmt_l = select(Lesson).where(Lesson.module_id == m.id).order_by(Lesson.order_index)
        res_l = await session.exec(stmt_l)
        lessons = res_l.all()
        
        m_dict = m.dict()
        m_dict["lessons"] = lessons
        modules_detail.append(m_dict)
        
    return {
        "course": course,
        "modules": modules_detail
    }

@router.patch("/{course_id}", response_model=CourseRead)
async def patch_course(
    course_in: CourseUpdate,
    course: Course = Depends(get_managed_course),
    session: AsyncSession = Depends(get_session)
):
    
    # Update fields
    if course_in.title is not None:
        course.title = course_in.title
    if course_in.description is not None:
        course.description = course_in.description
    if course_in.cover_url is not None:
        course.cover_url = course_in.cover_url
    if course_in.unlock_type is not None:
        course.unlock_type = course_in.unlock_type
    if course_in.unlock_value is not None:
        course.unlock_value = course_in.unlock_value
    if course_in.is_published is not None:
        course.is_published = course_in.is_published
        
    session.add(course)
    await session.commit()
    await session.refresh(course)
    return course

@router.delete("/{course_id}")
async def delete_course(
    course: Course = Depends(get_managed_course),
    session: AsyncSession = Depends(get_session)
):
    # Validated by Depends
    await session.delete(course)
    await session.commit()
    return {"message": "Course deleted"}

@router.post("/{course_id}/duplicate", response_model=CourseRead)
async def duplicate_course(
    course: Course = Depends(get_managed_course),
    session: AsyncSession = Depends(get_session)
):
    original_course = course
    course_id = course.id

    # 2. Create new course object
    new_course = Course(
        tenant_id=original_course.tenant_id,
        title=f"{original_course.title} (Copy)",
        description=original_course.description,
        cover_url=original_course.cover_url,
        unlock_type=original_course.unlock_type,
        unlock_value=original_course.unlock_value,
        is_published=False # Always start as draft
    )
    session.add(new_course)
    await session.flush() # Get new_course.id

    # 3. Duplicate Modules
    stmt_m = select(Module).where(Module.course_id == course_id).order_by(Module.order_index)
    res_m = await session.exec(stmt_m)
    modules = res_m.all()

    for m in modules:
        new_module = Module(
            course_id=new_course.id,
            title=m.title,
            order_index=m.order_index
        )
        session.add(new_module)
        await session.flush() # Get new_module.id

        # 4. Duplicate Lessons
        stmt_l = select(Lesson).where(Lesson.module_id == m.id).order_by(Lesson.order_index)
        res_l = await session.exec(stmt_l)
        lessons = res_l.all()

        for l in lessons:
            new_lesson = Lesson(
                module_id=new_module.id,
                title=l.title,
                video_provider=l.video_provider,
                video_id=l.video_id,
                content=l.content,
                order_index=l.order_index
            )
            session.add(new_lesson)

    await session.commit()
    await session.refresh(new_course)
    return new_course

# --- Module Endpoints ---

@router.post("/{course_id}/modules", response_model=ModuleRead)
async def create_module(
    module_in: ModuleCreate,
    course: Course = Depends(get_managed_course),
    session: AsyncSession = Depends(get_session)
):
    course_id = course.id
    
    new_module = Module(
        course_id=course_id,
        title=module_in.title,
        unlock_type=module_in.unlock_type or UnlockType.immediate,
        unlock_value=module_in.unlock_value,
        order_index=module_in.order_index
    )
    session.add(new_module)
    await session.commit()
    await session.refresh(new_module)
    return new_module

@router.get("/{course_id}/modules", response_model=List[ModuleRead])
async def list_modules(
    course: Course = Depends(get_managed_course),
    session: AsyncSession = Depends(get_session)
):
    stmt = select(Module).where(Module.course_id == course.id).order_by(Module.order_index)
    result = await session.exec(stmt)
    return result.all()

@router.patch("/modules/{module_id}", response_model=ModuleRead)
async def patch_module(
    module_in: ModuleUpdate,
    module: Module = Depends(get_managed_module),
    session: AsyncSession = Depends(get_session)
):
    
    if module_in.title is not None:
        module.title = module_in.title
    if module_in.unlock_type is not None:
        module.unlock_type = module_in.unlock_type
    if module_in.unlock_value is not None:
        module.unlock_value = module_in.unlock_value
    if module_in.order_index is not None:
        module.order_index = module_in.order_index
        
    session.add(module)
    await session.commit()
    await session.refresh(module)
    return module

@router.post("/modules/{module_id}/duplicate", response_model=ModuleRead)
async def duplicate_module(
    module: Module = Depends(get_managed_module),
    session: AsyncSession = Depends(get_session)
):
    module_id = module.id
    
    # 2. Create new module
    # Calculate order_index: get max in course + 1
    stmt_max = select(Module).where(Module.course_id == module.course_id)
    res_max = await session.exec(stmt_max)
    all_ms = res_max.all()
    max_idx = max([m.order_index for m in all_ms]) if all_ms else 0

    new_module = Module(
        course_id=module.course_id,
        title=f"{module.title} (Copy)",
        unlock_type=module.unlock_type,
        unlock_value=module.unlock_value,
        order_index=max_idx + 1
    )
    session.add(new_module)
    await session.flush()

    # 3. Duplicate Lessons
    stmt_l = select(Lesson).where(Lesson.module_id == module_id).order_by(Lesson.order_index)
    res_l = await session.exec(stmt_l)
    lessons = res_l.all()

    for l in lessons:
        new_lesson = Lesson(
            module_id=new_module.id,
            title=l.title,
            video_provider=l.video_provider,
            video_id=l.video_id,
            content=l.content,
            order_index=l.order_index
        )
        session.add(new_lesson)

    await session.commit()
    await session.refresh(new_module)
    return new_module

@router.delete("/modules/{module_id}")
async def delete_module(
    module: Module = Depends(get_managed_module),
    session: AsyncSession = Depends(get_session)
):
    
    # Check for lessons first (or let DB handle cascade if defined)
    # For MVP we just delete. SQLModel/SQLAlchemy Relationship(cascade="all, delete") is usually needed.
    await session.delete(module)
    await session.commit()
    return {"message": "Module deleted"}

# --- Lesson Endpoints ---

@router.post("/modules/{module_id}/lessons", response_model=LessonRead)
async def create_lesson(
    lesson_in: LessonCreate,
    module: Module = Depends(get_managed_module),
    session: AsyncSession = Depends(get_session)
):
    module_id = module.id
    from ..utils.logging_config import logger
    logger.info(f"CREATE LESSON: title={lesson_in.title}, content_len={len(lesson_in.content) if lesson_in.content else 0}")
    
    new_lesson = Lesson(
        module_id=module_id,
        title=lesson_in.title,
        video_provider=lesson_in.video_provider,
        video_id=lesson_in.video_id,
        content=lesson_in.content,
        order_index=lesson_in.order_index,
        is_published=lesson_in.is_published
    )
    session.add(new_lesson)
    await session.commit()
    await session.refresh(new_lesson)
    return new_lesson

@router.get("/modules/{module_id}/lessons", response_model=List[LessonRead])
async def list_lessons(
    module: Module = Depends(get_managed_module),
    session: AsyncSession = Depends(get_session)
):
    stmt = select(Lesson).where(Lesson.module_id == module.id).order_by(Lesson.order_index)
    result = await session.exec(stmt)
    return result.all()

@router.get("/lessons/{lesson_id}", response_model=LessonRead)
async def get_lesson(
    lesson: Lesson = Depends(get_managed_lesson)
):
    return lesson

@router.patch("/lessons/{lesson_id}", response_model=LessonRead)
async def patch_lesson(
    lesson_id: uuid.UUID,
    lesson_in: LessonUpdate,
    lesson: Lesson = Depends(get_managed_lesson),
    session: AsyncSession = Depends(get_session)
):
    from ..utils.logging_config import logger
    logger.info(f"PATCH LESSON: id={lesson_id}, content_len={len(lesson_in.content) if lesson_in.content else 'None' if lesson_in.content is None else 0}")
    
    if lesson_in.title is not None:
        lesson.title = lesson_in.title
    if lesson_in.video_provider is not None:
        lesson.video_provider = lesson_in.video_provider
    if lesson_in.video_id is not None:
        lesson.video_id = lesson_in.video_id
    if lesson_in.content is not None:
        lesson.content = lesson_in.content
    if lesson_in.order_index is not None:
        lesson.order_index = lesson_in.order_index
    if lesson_in.is_published is not None:
        lesson.is_published = lesson_in.is_published
    if lesson_in.module_id is not None:
        lesson.module_id = lesson_in.module_id
        
    session.add(lesson)
    await session.commit()
    await session.refresh(lesson)
    return lesson

@router.delete("/lessons/{lesson_id}")
async def delete_lesson(
    lesson: Lesson = Depends(get_managed_lesson),
    session: AsyncSession = Depends(get_session)
):
    
    await session.delete(lesson)
    await session.commit()
    return {"message": "Lesson deleted"}

# --- Bulk Reorder Endpoints ---

class BulkReorderItem(BaseModel):
    id: uuid.UUID
    order_index: int

@router.post("/reorder/modules")
async def reorder_modules(
    items: List[BulkReorderItem],
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    for item in items:
        module = await session.get(Module, item.id)
        if module:
            # Multi-tenant check
            course = await session.get(Course, module.course_id)
            from ..utils.security import ensure_tenant_access
            await ensure_tenant_access(course.tenant_id, current_user, session)
            
            module.order_index = item.order_index
            session.add(module)
    await session.commit()
    return {"message": "Modules reordered"}

@router.post("/reorder/lessons")
async def reorder_lessons(
    items: List[BulkReorderItem],
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    for item in items:
        lesson = await session.get(Lesson, item.id)
        if lesson:
            # Multi-tenant check via context
            module = await session.get(Module, lesson.module_id)
            course = await session.get(Course, module.course_id)
            from ..utils.security import ensure_tenant_access
            await ensure_tenant_access(course.tenant_id, current_user, session)
            
            lesson.order_index = item.order_index
            session.add(lesson)
    await session.commit()
    return {"message": "Lessons reordered"}
