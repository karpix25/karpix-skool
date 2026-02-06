from fastapi import APIRouter, Depends, HTTPException, Body
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlmodel import select
from typing import Dict, Any
import hashlib
import hmac
import json
import time
from urllib.parse import parse_qs, unquote
from datetime import datetime, timedelta
import uuid

from ..db import get_session
from ..models import User, Tenant, TenantMember, MemberRole, Course, LessonProgress, MemberStatus
from ..config import settings
from .auth import create_access_token, get_current_user
from aiogram import Bot

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

def validate_telegram_data(init_data: str, bot_token: str) -> bool:
    """
    Validates the initData string from Telegram WebApp.
    """
    try:
        parsed_data = parse_qs(init_data)
        hash_value = parsed_data.get('hash', [''])[0]
        
        if not hash_value:
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
        
        return calculated_hash == hash_value
    except Exception as e:
        print(f"Validation Error: {e}")
        return False

@router.post("/login")
async def webapp_login(
    init_data: str = Body(..., embed=True),
    session: AsyncSession = Depends(get_session)
):
    # 1. Validate Init Data
    if not validate_telegram_data(init_data, settings.BOT_TOKEN):
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
        try:
            parsed = parse_qs(init_data)
            user_json = parsed.get('user', ['{}'])[0]
            user_data = json.loads(user_json)
            telegram_id = user_data.get('id')
            username = user_data.get('username')
            first_name = user_data.get('first_name')
            photo_url = user_data.get('photo_url')
        except Exception:
            raise HTTPException(status_code=400, detail="Bad data format")

    if not telegram_id:
        raise HTTPException(status_code=400, detail="No user ID")

    # 3. Find or Create User
    # Consistently robust ID comparison for Super Admin
    is_sa_match = False
    try:
        if settings.SUPER_ADMIN_ID is not None and telegram_id is not None:
            is_sa_match = int(str(telegram_id).strip()) == int(str(settings.SUPER_ADMIN_ID).strip())
    except Exception as e:
        print(f"DEBUG LOGIN ERROR: {e}")

    print(f"DEBUG LOGIN (Consolidated): tg_id={telegram_id}, target={settings.SUPER_ADMIN_ID}, match={is_sa_match}")

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
        await session.flush() # Get user.id
    elif is_sa_match and not user.is_super_admin:
        user.is_super_admin = True
        session.add(user)

    # 3.5 Ensure TenantMember exists
    stmt_t = select(Tenant)
    res_t = await session.exec(stmt_t)
    tenant = res_t.first()
    
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
    
    return {"access_token": token, "token_type": "bearer", "user": user}

@router.get("/courses")
async def list_student_courses(
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    # For now, return all published courses with progress
    # But first, check subscription for the first tenant (MVP assumes one tenant for now or we fetch it)
    stmt_t = select(Tenant)
    res_t = await session.exec(stmt_t)
    tenant = res_t.first()
    if tenant:
        await ensure_active_subscription(tenant.id, session)
        await ensure_active_membership(current_user.id, tenant.id, session)

    stmt = select(Course).where(Course.is_published == True)
    result = await session.exec(stmt)
    courses = result.all()
    
    # Get all completed lessons for this user to calculate progress
    from ..models import Module, Lesson, LessonProgress
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
        c_dict["total_lessons"] = total
        c_dict["completed_lessons"] = completed
        c_dict["progress_percent"] = int((completed / total) * 100) if total > 0 else 0
        output.append(c_dict)

    return output

@router.get("/me")
async def get_my_profile(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    # Promotion check
    is_sa_match = False
    try:
        if settings.SUPER_ADMIN_ID is not None and current_user.telegram_id is not None:
            is_sa_match = int(str(current_user.telegram_id).strip()) == int(str(settings.SUPER_ADMIN_ID).strip())
    except Exception as e:
        print(f"DEBUG ME ERROR: {e}")
    
    print(f"DEBUG ME (Consolidated): user_id={current_user.id}, tg_id={current_user.telegram_id}, target={settings.SUPER_ADMIN_ID}, match={is_sa_match}")

    if is_sa_match and not current_user.is_super_admin:
        current_user.is_super_admin = True
        session.add(current_user)
        await session.commit()
        await session.refresh(current_user)

    # Find active tenant membership
    stmt = select(TenantMember).where(TenantMember.user_id == current_user.id)
    res = await session.exec(stmt)
    membership = res.first()
    
    return {
        "user": current_user,
        "membership": membership # Contains xp, level, joined_at
    }

@router.get("/courses/{course_id}")
async def get_course_detail(
    course_id: str,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    from ..models import Module, Lesson, LessonProgress
    # Get Course
    course_uuid = uuid.UUID(course_id)
    stmt = select(Course).where(Course.id == course_uuid)
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

    # Get Modules sorted by order_index
    stmt_m = select(Module).where(Module.course_id == course_uuid).order_by(Module.order_index)
    result = await session.exec(stmt_m)
    modules = result.all()
    
    output = []
    for m in modules:
        # Get Lessons sorted by order_index
        stmt_l = select(Lesson).where(Lesson.module_id == m.id).order_by(Lesson.order_index)
        res_lessons = await session.exec(stmt_l)
        lessons = res_lessons.all()
        
        # Add completion status to lessons
        lessons_data = []
        for l in lessons:
            l_dict = l.dict()
            l_dict["is_completed"] = str(l.id) in completed_lesson_ids
            lessons_data.append(l_dict)

        # Calculate Lock
        m_locked = False
        m_reason = None
        if m.unlock_type == "level_based":
            req = int(m.unlock_value or 1)
            # Find membership
            stmt_m = select(TenantMember).where(TenantMember.user_id == current_user.id, TenantMember.tenant_id == course.tenant_id)
            res_m = await session.exec(stmt_m)
            memb = res_m.first()
            if not memb or memb.level < req:
                m_locked = True
                m_reason = f"Level {req} required"
        elif m.unlock_type == "time_relative":
            days = int(m.unlock_value or 0)
            stmt_m = select(TenantMember).where(TenantMember.user_id == current_user.id, TenantMember.tenant_id == course.tenant_id)
            res_m = await session.exec(stmt_m)
            memb = res_m.first()
            if memb:
                from datetime import timedelta
                unlock_date = memb.cohort_start_date + timedelta(days=days)
                if datetime.utcnow() < unlock_date:
                    m_locked = True
                    m_reason = f"Unlocks in {(unlock_date - datetime.utcnow()).days + 1}d"

        output.append({
            "id": m.id,
            "title": m.title,
            "unlock_type": m.unlock_type,
            "unlock_value": m.unlock_value,
            "is_locked": m_locked,
            "lock_reason": m_reason,
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
    from ..models import Module, Lesson, LessonProgress
    
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
    stmt = select(Module).where(Module.id == lesson.module_id)
    result = await session.exec(stmt)
    module = result.one_or_none()

    # Actually, we can get tenant_id from module -> course
    course = await session.get(Course, module.course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
        
    await ensure_active_subscription(course.tenant_id, session)
    await ensure_active_membership(current_user.id, course.tenant_id, session)

    stmt_m = select(TenantMember).where(
        TenantMember.user_id == current_user.id,
        TenantMember.tenant_id == course.tenant_id
    )
    res_m = await session.exec(stmt_m)
    membership = res_m.first()
    
    is_locked = False
    lock_reason = None
    
    if module.unlock_type == "level_based":
        required_level = int(module.unlock_value or 1)
        if not membership or membership.level < required_level:
            is_locked = True
            lock_reason = f"This module requires Level {required_level}. Your level: {membership.level if membership else 1}"
            
    elif module.unlock_type == "time_relative":
        days_required = int(module.unlock_value or 0)
        if membership:
            unlock_date = membership.cohort_start_date + timedelta(days=days_required)
            if datetime.utcnow() < unlock_date:
                is_locked = True
                days_left = (unlock_date - datetime.utcnow()).days + 1
                lock_reason = f"This module will unlock in {days_left} day(s)."
        else:
            is_locked = True
            lock_reason = "Membership not found."

    # Security: If locked, hide sensitive content
    if is_locked:
        lesson_data = lesson.dict()
        lesson_data["video_id"] = ""
        lesson_data["content"] = "This lesson is locked."
    else:
        lesson_data = lesson

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
        # Level up logic: level * 50
        needed_xp = membership.level * 50
        if membership.xp >= needed_xp:
            membership.level += 1
            # Send Notification via Telegram
            try:
                bot = Bot(token=settings.BOT_TOKEN)
                await bot.send_message(
                    chat_id=current_user.telegram_id,
                    text=f"🏆 **LEVEL UP!**\n\nCongratulations! You've reached **Level {membership.level}**! Keep going! 🚀",
                    parse_mode="Markdown"
                )
                await bot.session.close()
            except Exception as e:
                print(f"ERROR: Failed to send TG notification: {e}")
            
        session.add(membership)
    
    await session.commit()
    
    return {
        "message": "Lesson completed!",
        "xp_granted": xp_granted,
        "new_xp": membership.xp if membership else 0,
        "new_level": membership.level if membership else 1
    }
