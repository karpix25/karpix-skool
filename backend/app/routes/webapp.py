from fastapi import APIRouter, Depends, HTTPException, Body, BackgroundTasks
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlmodel import select, func, and_
from typing import Dict, Any, Optional
import hashlib
import hmac
import json
import time
from urllib.parse import parse_qs, unquote
from datetime import datetime, timedelta
import uuid

from ..db import get_session
from ..models import User, Tenant, TenantMember, MemberRole, Course, LessonProgress, MemberStatus, Module, Lesson, CourseUnlockType
from ..config import settings
from .auth import get_current_user, get_super_user
from ..auth import create_access_token
from ..utils.logging_config import logger

router = APIRouter()

async def ensure_active_subscription(tenant_id: uuid.UUID, session: AsyncSession):
    tenant = await session.get(Tenant, tenant_id)
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    if tenant.subscription_status != "active":
        raise HTTPException(
            status_code=402, 
            detail="Subscription inactive. Please contact the administrator."
        )
    
    if tenant.expires_at and tenant.expires_at < datetime.utcnow():
        raise HTTPException(
            status_code=402,
            detail="Access to this school has expired. Please contact the administrator."
        )
        
    return tenant

async def ensure_active_membership(user_id: uuid.UUID, tenant_id: uuid.UUID, session: AsyncSession):
    stmt = select(TenantMember).where(
        TenantMember.user_id == user_id,
        TenantMember.tenant_id == tenant_id
    )
    res = await session.exec(stmt)
    membership = res.first()
    
    if not membership:
        raise HTTPException(status_code=403, detail="Membership not found.")
        
    if membership.status == MemberStatus.paused:
        raise HTTPException(
            status_code=403, 
            detail="Ваше обучение приостановлено. Пожалуйста, вернитесь в закрытую группу проекта, чтобы восстановить доступ."
        )
    return membership

async def check_vip_membership(user_tg_id: int, tenant: Tenant) -> bool:
    """
    Checks if the user is a member of the VIP group for the given tenant.
    """
    if not tenant.telegram_group_id_vip:
        return False
        
    try:
        from aiogram import Bot
        bot = Bot(token=settings.BOT_TOKEN)
        member = await bot.get_chat_member(tenant.telegram_group_id_vip, user_tg_id)
        # Always close session to avoid leaks in short-lived bot instances
        await bot.session.close()
        return member.status in ["member", "administrator", "creator"]
    except Exception as e:
        logger.error(f"VIP Check Error: {e}")
        return False

def validate_telegram_data(init_data: str, bot_token: str) -> bool:
    """
    Validates the initData string from Telegram WebApp.
    """
    try:
        parsed_data = parse_qs(init_data)
        hash_value = parsed_data.get('hash', [''])[0]
        
        if not hash_value:
            logger.warning("Validation Error: No hash found")
            return False
            
        # Check auth_date for replay attack prevention
        auth_date = int(parsed_data.get('auth_date', [0])[0])
        current_time = int(time.time())
        if auth_date == 0 or (current_time - auth_date > 86400):
            logger.warning(f"Validation Error: auth_date expired or missing ({auth_date}, current={current_time})")
            return False
            
        # Create data-check-string
        data_check_arr = []
        for key, value in parsed_data.items():
            if key == 'hash':
                continue
            data_check_arr.append(f"{key}={value[0]}")
        
        data_check_arr.sort()
        data_check_string = "\n".join(data_check_arr)
        
        # Calculate secret key
        secret_key = hmac.new(b"WebAppData", bot_token.encode(), hashlib.sha256).digest()
        
        # Calculate hash
        calculated_hash = hmac.new(secret_key, data_check_string.encode(), hashlib.sha256).hexdigest()
        
        if calculated_hash != hash_value:
            logger.warning(f"Validation Error: hash mismatch. Calculated: {calculated_hash}, Received: {hash_value}")
            return False
            
        return True
    except Exception as e:
        logger.error(f"Validation Error: {e}")
        return False

@router.post("/login")
async def webapp_login(
    init_data: str = Body(..., embed=True),
    session: AsyncSession = Depends(get_session)
):
    # 1. Validate Init Data
    # Allow bypass for development if needed, but for now strict
    # For localhost dev without real telegram, we might need a bypass or mock data
    # Check for dev bypass
    if init_data.startswith("query_id=") or init_data.startswith("user="):
         pass # proceed to check
    else:
         # Dev bypass for "mock"
         if settings.ENVIRONMENT == "development" and init_data == "mock_student":
            pass
         else:
            # If validation fails
            if not validate_telegram_data(init_data, settings.BOT_TOKEN):
                logger.warning(f"Invalid WebApp Init Data from user {init_data}") # Log the raw init_data for debugging
                raise HTTPException(status_code=401, detail="Invalid Telegram data")

    telegram_id = None
    username = None
    first_name = None
    photo_url = None

    # Check for dev mock first
    if settings.ENVIRONMENT == "development" and init_data == "mock_student":
         telegram_id = 123456789
         username = "student_dev"
         first_name = "Dev Student"
         photo_url = None
    else:
        # Parse Real Data
        start_param = None
        try:
            parsed = parse_qs(init_data)
            user_json = parsed.get('user', ['{}'])[0]
            user_data = json.loads(user_json)
            telegram_id = user_data.get('id')
            username = user_data.get('username')
            first_name = user_data.get('first_name')
            photo_url = user_data.get('photo_url')
            
            # Extract start_param (used for tenant identification)
            start_param = parsed.get('start_param', [None])[0]
        except Exception:
            raise HTTPException(status_code=400, detail="Bad data format")

    if not telegram_id:
        raise HTTPException(status_code=400, detail="No user ID")

    # 3. Find or Create User
    is_sa_match = False
    try:
        if settings.SUPER_ADMIN_ID is not None and telegram_id is not None:
            is_sa_match = int(str(telegram_id).strip()) == int(str(settings.SUPER_ADMIN_ID).strip())
    except Exception as e:
        logger.error(f"DEBUG LOGIN ERROR: {e}")

    stmt = select(User).where(User.telegram_id == telegram_id)
    result = await session.exec(stmt)
    user = result.first()

    if not user:
        user = User(
            telegram_id=telegram_id,
            username=username,
            avatar_url=photo_url,
            is_super_admin=is_sa_match
        )
        session.add(user)
        await session.flush()
    else:
        # Update existing user data if changed
        changed = False
        if user.username != username:
            user.username = username
            changed = True
        # Avatar Persistence Logic
        if photo_url:
            import hashlib
            import aiohttp
            from ..utils.r2 import storage

            # 1. Calc hash of TG URL (source)
            url_hash = hashlib.md5(photo_url.encode()).hexdigest()
            expected_filename = f"avatars/{user.telegram_id}_{url_hash}.jpg"
            
            # 2. Check if current DB avatar is already this R2 file
            current_avatar = user.avatar_url or ""
            is_already_persisted = expected_filename in current_avatar

            if not is_already_persisted:
                try:
                    # Download from TG
                    async with aiohttp.ClientSession() as http_session:
                        async with http_session.get(photo_url) as resp:
                            if resp.status == 200:
                                content = await resp.read()
                                # Upload to R2 with deterministic name
                                r2_url = await storage.upload_file(
                                    file_content=content,
                                    filename=f"{user.telegram_id}_{url_hash}.jpg",
                                    folder="avatars",
                                    use_uuid=False
                                )
                                user.avatar_url = r2_url
                                changed = True
                except Exception as e:
                    logger.error(f"AVATAR SYNC ERROR: {e}")
                    # Fallback to TG URL if sync fails
                    if user.avatar_url != photo_url:
                        user.avatar_url = photo_url
                        changed = True
        elif user.avatar_url:
             # Photo removed in TG
             user.avatar_url = None
             changed = True
        
        if is_sa_match and not user.is_super_admin:
            user.is_super_admin = True
            changed = True
            
        if changed:
            session.add(user)

    # 3.5 Find the correct Tenant
    tenant = None
    if start_param:
        # Check if start_param is setup_code
        stmt_t = select(Tenant).where(Tenant.setup_code == start_param)
        res_t = await session.exec(stmt_t)
        tenant = res_t.first()
        
        # If not setup_code, check if it's a UUID (e.g. from internal link)
        if not tenant:
            try:
                import uuid
                tenant_uuid = uuid.UUID(start_param)
                tenant = await session.get(Tenant, tenant_uuid)
            except (ValueError, ImportError):
                pass
    
    # Smart Fallback: 
    # If no specific tenant found via start_param, try to get user's existing membership
    if not tenant:
        stmt_my_m = select(Tenant).join(TenantMember).where(TenantMember.user_id == user.id)
        res_my_m = await session.exec(stmt_my_m)
        tenant = res_my_m.first()
    
    # Global Fallback (only for brand new users with no link/param)
    if not tenant:
        stmt_global = select(Tenant)
        res_global = await session.exec(stmt_global)
        tenant = res_global.first()

    
    membership = None
    if tenant:
        stmt_m = select(TenantMember).where(
            TenantMember.user_id == user.id,
            TenantMember.tenant_id == tenant.id
        )
        res_m = await session.exec(stmt_m)
        membership = res_m.first()
        if not membership:
            membership = TenantMember(user_id=user.id, tenant_id=tenant.id)
            session.add(membership)
        elif membership.status == MemberStatus.paused:
            # Reactivate paused membership on login (user rejoined)
            membership.status = MemberStatus.active
            membership.paused_at = None
            session.add(membership)
            
    await session.commit()
    await session.refresh(user)
    if membership:
        await session.refresh(membership)
    
    # 4. Create Token
    # Determine role for token (optional metadata)
    role = "student"
    if user.is_super_admin or (membership and (membership.role == "admin" or membership.role == "owner")):
        role = "admin"

    token = create_access_token(subject=str(user.id), extra_data={"role": role})
    
    return {
        "access_token": token, 
        "token_type": "bearer", 
        "user": {
            "id": str(user.id),
            "username": user.username,
            "telegram_id": user.telegram_id,
            "is_super_admin": user.is_super_admin,
            "admin_status": user.admin_status
        }
    }

from ..utils.cache import cache_route, clear_cache
from fastapi import Request

@router.post("/debug/clear-cache")
async def force_clear_cache(
    current_user: User = Depends(get_super_user),
):
    await clear_cache("cache:*")
    return {"message": "All cache cleared"}

@router.get("/courses")
@cache_route(ttl=300)
async def list_student_courses(
    request: Request,
    tenant_id: Optional[uuid.UUID] = None,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    # 1. Get all active memberships for the user
    stmt_m = select(TenantMember).where(
        TenantMember.user_id == current_user.id,
        TenantMember.status == MemberStatus.active
    )
    if tenant_id:
        stmt_m = stmt_m.where(TenantMember.tenant_id == tenant_id)
    
    res_m = await session.exec(stmt_m)
    memberships = res_m.all()

    from ..utils.logging_config import logger
    logger.info(f"DEBUG_COURSES: user={current_user.username} (id={current_user.id}), tenant={tenant_id}, found_memberships={len(memberships)}")


    
    if not memberships:
        return []

    tenant_ids = [m.tenant_id for m in memberships]
    logger.info(f"DEBUG_COURSES: tenant_ids={tenant_ids}")
    m_map = {m.tenant_id: m for m in memberships}


    # 2. Get all courses with lesson counts
    from sqlalchemy import func, and_
    from sqlalchemy.orm import selectinload
    
    stmt = (
        select(
            Course,
            func.count(Lesson.id).label("total_lessons"),
            func.count(LessonProgress.id).label("completed_lessons")
        )
        .outerjoin(Module, Module.course_id == Course.id)
        .outerjoin(Lesson, Lesson.module_id == Module.id)

        .outerjoin(LessonProgress, and_(
            LessonProgress.lesson_id == Lesson.id,
            LessonProgress.user_id == current_user.id
        ))
        .where(
            Course.is_published == True,
            Course.tenant_id.in_(tenant_ids),
            Course.deleted_at == None
        )
        .options(selectinload(Course.tenant)) # Eager load tenant for VIP check
        .group_by(Course.id)
    )
    
    results = await session.exec(stmt)
    results_all = results.all()
    logger.info(f"DEBUG_COURSES: query_results_count={len(results_all)}")
    
    output = []
    for course, total, completed in results_all:

        c_dict = course.dict()
        c_dict["total_lessons"] = total
        c_dict["completed_lessons"] = completed
        c_dict["progress_percent"] = int((completed / total) * 100) if total > 0 else 0
        
        # Lock Logic (Simplified version of get_course_detail)
        is_vip_locked = False
        is_prog_locked = False
        lock_reason = None
        
        membership = m_map.get(course.tenant_id)
        
        if course.is_vip:
            is_user_vip = await check_vip_membership(current_user.telegram_id, course.tenant)
            if not is_user_vip:
                is_vip_locked = True
                lock_reason = "PREMIUM ONLY"
        
        if not is_vip_locked and membership:
            if course.unlock_type == CourseUnlockType.level_based:
                required = int(course.unlock_value or 0)
                if membership.level < required:
                    is_prog_locked = True
                    lock_reason = f"LEVEL {required} REQUIRED"
            elif course.unlock_type == CourseUnlockType.time_relative:
                days = int(course.unlock_value or 0)
                if (datetime.utcnow() - membership.joined_at).days < days:
                    is_prog_locked = True
                    lock_reason = f"UNLOCKS IN {days} DAYS"

        c_dict["is_unlocked"] = not (is_vip_locked or is_prog_locked)
        c_dict["lock_reason"] = lock_reason
        
        output.append(c_dict)
        
    return output

@router.get("/me")
async def get_my_profile(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
    tenant_id: Optional[uuid.UUID] = None,
    setup_code: Optional[str] = None
):
    logger.debug(f"DEBUG_ME: Entering get_my_profile for user={current_user.id}")
    # Promotion check
    is_sa_match = False
    try:
        if settings.SUPER_ADMIN_ID is not None and current_user.telegram_id is not None:
            is_sa_match = int(str(current_user.telegram_id).strip()) == int(str(settings.SUPER_ADMIN_ID).strip())
    except Exception as e:
        logger.error(f"DEBUG ME ERROR: {e}")
    
    if is_sa_match and not current_user.is_super_admin:
        current_user.is_super_admin = True
        session.add(current_user)
        await session.commit()
        await session.refresh(current_user)

    # Find relevant membership with Tenant loaded
    from sqlalchemy.orm import selectinload
    stmt = select(TenantMember).where(TenantMember.user_id == current_user.id).options(selectinload(TenantMember.tenant))
    
    if tenant_id:
        stmt = stmt.where(TenantMember.tenant_id == tenant_id)
    elif setup_code:
        # Resolve setup_code to tenant_id
        stmt_t = select(Tenant.id).where(Tenant.setup_code == setup_code)
        res_t = await session.exec(stmt_t)
        t_id_found = res_t.first()
        if t_id_found:
            stmt = stmt.where(TenantMember.tenant_id == t_id_found)

    res = await session.exec(stmt)
    active_membership = res.first()
    
    # Get ALL memberships for the school switcher
    all_stmt = select(TenantMember).where(TenantMember.user_id == current_user.id).options(selectinload(TenantMember.tenant))
    all_res = await session.exec(all_stmt)
    all_memberships = all_res.all()
    
    # If no specific membership found but user has others, just use first as active
    if not active_membership and all_memberships:
        active_membership = all_memberships[0]

    
    return {
        "user": {
            "id": str(current_user.id),
            "username": current_user.username,
            "telegram_id": current_user.telegram_id,
            "is_super_admin": current_user.is_super_admin,
            "admin_status": current_user.admin_status,
            "avatar_url": current_user.avatar_url
        },
        "membership": {
            "id": str(active_membership.id),
            "role": active_membership.role,
            "status": active_membership.status,
            "tenant_id": str(active_membership.tenant_id),
            "level": active_membership.level,
            "xp": active_membership.xp
        } if active_membership else None,
        "tenant": {
            "id": str(active_membership.tenant.id),
            "name": active_membership.tenant.name,
            "level_names": active_membership.tenant.level_names
        } if active_membership and active_membership.tenant else None,
        "memberships": [
            {
                "tenant_id": str(m.tenant_id),
                "tenant_name": m.tenant.name,
                "role": m.role,
                "level": m.level,
                "xp": m.xp
            } for m in all_memberships
        ]
    }


@router.get("/courses/{course_id}")
@cache_route(ttl=600)
async def get_course_detail(
    course_id: str,
    request: Request,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    # Get Course with eager loading modules and lessons
    from sqlalchemy.orm import selectinload
    course_uuid = uuid.UUID(course_id)
    stmt = (
        select(Course)
        .where(
            Course.id == course_uuid, 
            Course.is_published == True,
            Course.deleted_at == None
        )
        .options(
            selectinload(Course.modules.and_(Module.deleted_at == None)).selectinload(Lesson.and_(Lesson.deleted_at == None))
        )
    )
    result = await session.exec(stmt)
    course = result.one_or_none()
    
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    await ensure_active_subscription(course.tenant_id, session)
    await ensure_active_membership(current_user.id, course.tenant_id, session)

    # Get User's Progress
    stmt_p = select(LessonProgress).where(LessonProgress.user_id == current_user.id)
    res_p = await session.exec(stmt_p)
    completed_lesson_ids = {str(p.lesson_id) for p in res_p.all()}

    # 1. Course Access Check (Single point of truth)
    course_vip_locked = False
    course_prog_locked = False
    course_lock_reason = None
    
    # VIP Check
    if course.is_vip:
        is_user_vip = await check_vip_membership(current_user.telegram_id, course.tenant)
        if not is_user_vip:
            course_vip_locked = True
            course_lock_reason = "💎 VIP"
            
    # Progression Check
    stmt_mship = select(TenantMember).where(
        TenantMember.user_id == current_user.id,
        TenantMember.tenant_id == course.tenant_id
    )
    res_mship = await session.exec(stmt_mship)
    membership = res_mship.first()
    
    if not course_vip_locked and membership:
        if course.unlock_type == CourseUnlockType.level_based:
            required = int(course.unlock_value or 0)
            if membership.level < required:
                course_prog_locked = True
                course_lock_reason = f"🔒 Уровень {required}"
        elif course.unlock_type == CourseUnlockType.time_relative:
            days = int(course.unlock_value or 0)
            from datetime import datetime
            if (datetime.utcnow() - membership.joined_at).days < days:
                course_prog_locked = True
                course_lock_reason = f"⏳ Через {days} дн."

    is_course_locked = course_vip_locked or course_prog_locked

    output = []
    # Use pre-loaded modules directly from the course object
    for m in sorted(course.modules, key=lambda x: x.order_index):
        lessons_data = []
        # Use pre-loaded lessons directly from the module object
        for l in sorted(m.lessons, key=lambda x: x.order_index):
            l_dict = l.dict()
            l_dict["is_completed"] = str(l.id) in completed_lesson_ids
            # Child inherits course lock
            l_dict["is_locked"] = is_course_locked
            l_dict["lock_reason"] = course_lock_reason
            lessons_data.append(l_dict)

        output.append({
            "id": str(m.id),
            "title": m.title,
            "is_locked": is_course_locked,
            "lock_reason": course_lock_reason,
            "lessons": lessons_data
        })
        
    # Calculate overall progress
    total_lessons_count = 0
    completed_lessons_count = 0
    for m in output:
        for l in m["lessons"]:
            total_lessons_count += 1
            if l["is_completed"]:
                completed_lessons_count += 1

    return {
        "course": course,
        "modules": output,
        "total_lessons": total_lessons_count,
        "completed_lessons": completed_lessons_count,
        "progress_percent": int((completed_lessons_count / total_lessons_count) * 100) if total_lessons_count > 0 else 0
    }

@router.get("/lessons/{lesson_id}")
async def get_lesson_view(
    lesson_id: str,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    from ..models import Module, Lesson, LessonProgress, TenantMember
    
    # Get Lesson
    lesson_uuid = uuid.UUID(lesson_id)
    lesson = await session.get(Lesson, lesson_uuid)
    
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")

    # Check Progress
    stmt_p = select(LessonProgress).where(
        LessonProgress.user_id == current_user.id,
        LessonProgress.lesson_id == lesson.id
    )
    res_p = await session.exec(stmt_p)
    is_completed = res_p.first() is not None

    # Get Module to check locks
    stmt = select(Module).where(
        Module.id == lesson.module_id,
        Module.deleted_at == None
    )
    result = await session.exec(stmt)
    module = result.one_or_none()

    # Actually, we can get tenant_id from module -> course
    course = await session.get(Course, module.course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
        
    await ensure_active_subscription(course.tenant_id, session)
    
    # Allow admins to bypass membership check for preview
    from ..utils.security import is_tenant_admin
    is_admin = await is_tenant_admin(course.tenant_id, current_user, session)
    if not is_admin:
        await ensure_active_membership(current_user.id, course.tenant_id, session)

    stmt_m = select(TenantMember).where(
        TenantMember.user_id == current_user.id,
        TenantMember.tenant_id == course.tenant_id
    )
    res_m = await session.exec(stmt_m)
    membership = res_m.first()
    
    is_locked = False
    lock_reason = None
    # Unlock logic removed, lessons are always open if course is accessible

    # Security: If locked, hide sensitive content
    lesson_data = lesson.dict()
    if is_locked:
        lesson_data["video_id"] = ""
        lesson_data["content"] = "This lesson is locked."
    
    from ..utils.logging_config import logger
    logger.info(f"FETCH LESSON: id={lesson_id}, content_len={len(lesson_data.get('content', '')) if lesson_data.get('content') else 0}")

    # Find Next Lesson
    next_lesson_id = None
    all_course_lessons = await session.exec(
        select(Lesson)
        .join(Module)
        .where(Module.course_id == module.course_id)
        .order_by(Module.order_index, Lesson.order_index)
    )
    all_lessons = all_course_lessons.all()
    for i, l in enumerate(all_lessons):
        if l.id == lesson.id:
            if i + 1 < len(all_lessons):
                next_lesson_id = all_lessons[i+1].id
            break

    return {
        "lesson": lesson_data,
        "is_completed": is_completed,
        "is_locked": is_locked,
        "lock_reason": lock_reason,
        "course_id": module.course_id,
        "next_lesson_id": next_lesson_id
    }

@router.post("/lessons/{lesson_id}/complete")
async def complete_lesson(
    lesson_id: str,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    from ..models import Lesson, LessonProgress, TenantMember, Course, Module
    
    # 1. Check if lesson exists
    lesson_uuid = uuid.UUID(lesson_id)
    lesson = await session.get(Lesson, lesson_uuid)
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")
        
    # 2. Check if already completed
    stmt = select(LessonProgress).where(
        LessonProgress.user_id == current_user.id,
        LessonProgress.lesson_id == lesson_uuid
    )
    existing = await session.exec(stmt)
    if existing.first():
        return {"message": "Already completed", "xp_granted": 0}
        
    # 3. Record Progress
    progress = LessonProgress(user_id=current_user.id, lesson_id=lesson_uuid)
    session.add(progress)
    
    # 4. Grant XP & Handle Level Up
    # We need to find the membership for this specific tenant
    # Find module -> course -> tenant
    module = await session.get(Module, lesson.module_id)
    course = await session.get(Course, module.course_id)
    
    await ensure_active_subscription(course.tenant_id, session)
    await ensure_active_membership(current_user.id, course.tenant_id, session)

    stmt_m = select(TenantMember).where(
        TenantMember.user_id == current_user.id,
        TenantMember.tenant_id == course.tenant_id
    )
    res_m = await session.exec(stmt_m)
    membership = res_m.first()
    
    xp_granted = 10
    if membership:
        membership.xp += xp_granted
        
        # Level thresholds (0-based for easy check)
        # L1: 0 (Start)
        # L2: 100
        # L3: 300
        # L4: 800
        # L5: 2000
        # L6: 3000
        # L7: 5000
        # L8: 7500
        # L9: 10000 (Max)
        LEVEL_THRESHOLDS = {
            1: 0,
            2: 100,
            3: 300,
            4: 800,
            5: 2000,
            6: 3000,
            7: 5000,
            8: 7500,
            9: 10000
        }
        
        current_level = membership.level
        next_level = current_level + 1
        
        # Check if max level reached
        if next_level <= 9:
            needed_xp = LEVEL_THRESHOLDS.get(next_level, 10000)
            if membership.xp >= needed_xp:
                membership.level = next_level
                background_tasks.add_task(send_level_up_notification, current_user.telegram_id, membership.level)
            
        session.add(membership)
    
    await session.commit()
    
    return {
        "message": "Lesson completed!",
        "xp_granted": xp_granted,
        "new_xp": membership.xp if membership else 0,
        "new_level": membership.level if membership else 1
    }

async def send_level_up_notification(telegram_id: int, level: int):
    try:
        from aiogram import Bot
        bot = Bot(token=settings.BOT_TOKEN)
        await bot.send_message(
            chat_id=telegram_id,
            text=f"🏆 **LEVEL UP!**\n\nCongratulations! You've reached **Level {level}**! Keep going! 🚀",
            parse_mode="Markdown"
        )
        await bot.session.close()
    except Exception as e:
        logger.error(f"FAILED TO SEND TG NOTIFICATION: {e}")

@router.get("/leaderboard")
async def get_leaderboard(
    period: str = "all", # all, month, week
    tenant_id: Optional[uuid.UUID] = None,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """
    Returns ranked members for the tenants the user belongs to.
    """
    # 1. Get Tenant IDs
    if tenant_id:
        tenant_ids = [tenant_id]
    else:
        stmt_m = select(TenantMember.tenant_id).where(TenantMember.user_id == current_user.id)
        res_m = await session.exec(stmt_m)
        tenant_ids = res_m.all()


    if not tenant_ids:
        return {"top_three": [], "others": [], "user_rank": None}

    # 2. Define Time Filter
    since = None
    if period == "month":
        since = datetime.utcnow() - timedelta(days=30)
    elif period == "week":
        since = datetime.utcnow() - timedelta(days=7)

    # 3. Query for Rankings
    # For "all", we use TenantMember.xp directly
    # For "month"/"week", we count LessonProgress * 10 (approximate XP)
    
    if period == "all":
        stmt = (
            select(TenantMember, User)
            .join(User, TenantMember.user_id == User.id)
            .where(TenantMember.tenant_id.in_(tenant_ids))
            .order_by(TenantMember.xp.desc())
            .limit(10)
        )
        res = await session.exec(stmt)
        all_members = res.all()
        
        ranking = []
        for i, (member, user) in enumerate(all_members):
            ranking.append({
                "rank": i + 1,
                "user_id": str(user.id),
                "username": user.username or "Anonymous",
                "avatar_url": user.avatar_url,
                "xp": member.xp,
                "level": member.level,
                "is_me": user.id == current_user.id
            })
    else:
        # Count LessonProgress for specific period
        # Note: This ignores XP from other sources if any are added later
        stmt_period = (
            select(
                User.id, 
                User.username, 
                User.avatar_url, 
                func.count(LessonProgress.id).label("completions"),
                # We still need the base level from membership
                TenantMember.level
            )
            .join(TenantMember, TenantMember.user_id == User.id)
            .join(LessonProgress, LessonProgress.user_id == User.id)
            .where(
                TenantMember.tenant_id.in_(tenant_ids),
                LessonProgress.completed_at >= since
            )
            .group_by(User.id, TenantMember.level)
            .order_by(func.count(LessonProgress.id).desc())
            .limit(10)
        )
        res = await session.exec(stmt_period)
        period_data = res.all()
        
        ranking = []
        for i, (uid, name, avatar, completions, level) in enumerate(period_data):
            ranking.append({
                "rank": i + 1,
                "user_id": str(uid),
                "username": name or "Anonymous",
                "avatar_url": avatar,
                "xp": completions * 10, # Hardcoded 10 XP per lesson match complete_lesson logic
                "level": level,
                "is_me": uid == current_user.id
            })

    # 4. Split and Prepare Response
    top_three = [r for r in ranking if r["rank"] <= 3]
    others = [r for r in ranking if r["rank"] > 3]
    
    user_data = next((r for r in ranking if r["is_me"]), None)
    
    # If user is not in the list (e.g. 0 XP in period), we need to handle it
    if not user_data and period == "all":
         # Should not happen if All Time, but just in case
         pass
    elif not user_data:
        # Get base info for User Bar
        stmt_me = select(TenantMember).where(
            TenantMember.user_id == current_user.id,
            TenantMember.tenant_id.in_(tenant_ids)
        )
        res_me = await session.exec(stmt_me)
        m_me = res_me.first()
        user_data = {
            "rank": 999, # Placeholder or calculate real rank?
            "user_id": str(current_user.id),
            "username": current_user.username,
            "avatar_url": current_user.avatar_url,
            "xp": 0,
            "level": m_me.level if m_me else 1,
            "is_me": True
        }

    return {
        "top_three": top_three,
        "others": others,
        "user_rank": user_data
    }
