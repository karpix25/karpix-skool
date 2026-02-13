from fastapi import APIRouter, Depends, HTTPException, Body
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlmodel import select
from typing import Dict, Any, Optional
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
        print(f"VIP Check Error: {e}")
        return False

def validate_telegram_data(init_data: str, bot_token: str) -> bool:
    """
    Validates the initData string from Telegram WebApp.
    """
    try:
        parsed_data = parse_qs(init_data)
        hash_value = parsed_data.get('hash', [''])[0]
        
        if not hash_value:
            print("Validation Error: No hash found")
            return False
            
        # Check auth_date for replay attack prevention
        auth_date = int(parsed_data.get('auth_date', [0])[0])
        current_time = int(time.time())
        if auth_date == 0 or (current_time - auth_date > 86400):
            print(f"Validation Error: auth_date expired or missing ({auth_date}, current={current_time})")
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
            print(f"Validation Error: hash mismatch. Calculated: {calculated_hash}, Received: {hash_value}")
            return False
            
        return True
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
        print(f"DEBUG LOGIN ERROR: {e}")

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
                    print(f"AVATAR SYNC ERROR: {e}")
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
        
        # If not setup_code, check if it's a UUID
        if not tenant:
            try:
                tenant_uuid = uuid.UUID(start_param)
                tenant = await session.get(Tenant, tenant_uuid)
            except ValueError:
                pass
    
    # Fallback to the first tenant if none found (backwards compatibility for "naked" opens)
    if not tenant:
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

@router.get("/courses")
async def list_student_courses(
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    # Find all tenants where the user is a member
    stmt_m = select(TenantMember.tenant_id).where(TenantMember.user_id == current_user.id)
    res_m = await session.exec(stmt_m)
    tenant_ids = res_m.all()

    if not tenant_ids:
        return []

    # Get only published courses belonging to those tenants
    stmt = select(Course).where(
        Course.is_published == True,
        Course.tenant_id.in_(tenant_ids)
    )
    result = await session.exec(stmt)
    courses = result.all()
    
    # Get all completed lessons for this user to calculate progress
    from ..models import Module, Lesson, LessonProgress, TenantMember
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
    session: AsyncSession = Depends(get_session),
    tenant_id: Optional[uuid.UUID] = None,
    setup_code: Optional[str] = None
):
    print(f"DEBUG_ME: Entering get_my_profile for user={current_user.id}")
    # Promotion check
    is_sa_match = False
    try:
        if settings.SUPER_ADMIN_ID is not None and current_user.telegram_id is not None:
            is_sa_match = int(str(current_user.telegram_id).strip()) == int(str(settings.SUPER_ADMIN_ID).strip())
    except Exception as e:
        print(f"DEBUG ME ERROR: {e}")
    
    if is_sa_match and not current_user.is_super_admin:
        current_user.is_super_admin = True
        session.add(current_user)
        await session.commit()
        await session.refresh(current_user)

    # Find relevant membership
    stmt = select(TenantMember).where(TenantMember.user_id == current_user.id)
    
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
    membership = res.first()
    
    # If no specific membership found but user has others, just return first as fallback
    if not membership and not (tenant_id or setup_code):
        stmt_fallback = select(TenantMember).where(TenantMember.user_id == current_user.id)
        res_fallback = await session.exec(stmt_fallback)
        membership = res_fallback.first()
    
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
            "id": str(membership.id),
            "role": membership.role,
            "status": membership.status,
            "tenant_id": str(membership.tenant_id)
        } if membership else None
    }

@router.get("/courses/{course_id}")
async def get_course_detail(
    course_id: str,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    from ..models import Module, Lesson, LessonProgress, TenantMember
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
        # Get User's Membership for progression checks
        stmt_mship = select(TenantMember).where(
            TenantMember.user_id == current_user.id,
            TenantMember.tenant_id == course.tenant_id
        )
        res_mship = await session.exec(stmt_mship)
        membership = res_mship.first()

        # Get Lessons sorted by order_index
        stmt_l = select(Lesson).where(Lesson.module_id == m.id).order_by(Lesson.order_index)
        res_lessons = await session.exec(stmt_l)
        lessons = res_lessons.all()

        # Add completion status to lessons
        lessons_data = []
        for l in lessons:
            # 1. VIP Check
            l_is_vip = getattr(l, 'is_vip', False)
            is_user_vip = await check_vip_membership(current_user.telegram_id, course.tenant) if l_is_vip else True
            
            l_vip_locked = l_is_vip and not is_user_vip
            
            # 2. Progression Check
            l_prog_locked = False
            l_lock_reason = None
            if membership and l.unlock_type == UnlockType.level_based:
                required = int(l.unlock_value or 0)
                if membership.level < required:
                    l_prog_locked = True
                    l_lock_reason = f"🔒 Уровень {required}"
            elif membership and l.unlock_type == UnlockType.time_relative:
                days = int(l.unlock_value or 0)
                from datetime import datetime
                if (datetime.utcnow() - membership.joined_at).days < days:
                    l_prog_locked = True
                    l_lock_reason = f"⏳ Через {days} дн."

            l_locked = l_vip_locked or l_prog_locked
            if l_vip_locked:
                l_lock_reason = "💎 VIP"

            l_dict = l.dict()
            l_dict["is_completed"] = str(l.id) in completed_lesson_ids
            l_dict["is_vip"] = l_is_vip
            l_dict["is_locked"] = l_locked
            l_dict["lock_reason"] = l_lock_reason
            lessons_data.append(l_dict)

        # VIP Locking Logic (Module)
        m_is_vip = getattr(m, 'is_vip', False)
        is_user_vip = await check_vip_membership(current_user.telegram_id, course.tenant) if m_is_vip else True
        m_vip_locked = m_is_vip and not is_user_vip
        
        # Progression Check (Module)
        m_prog_locked = False
        m_reason = None
        if membership and m.unlock_type == UnlockType.level_based:
            required = int(m.unlock_value or 0)
            if membership.level < required:
                m_prog_locked = True
                m_reason = f"🔒 Откроется на {required} уровне"
        elif membership and m.unlock_type == UnlockType.time_relative:
            days = int(m.unlock_value or 0)
            from datetime import datetime
            if (datetime.utcnow() - membership.joined_at).days < days:
                m_prog_locked = True
                m_reason = f"⏳ Откроется через {days} дней обучения"

        m_locked = m_vip_locked or m_prog_locked
        if m_vip_locked:
            m_reason = "💎 Доступно только для VIP-участников"

        output.append({
            "id": str(m.id),
            "title": m.title,
            "unlock_type": m.unlock_type,
            "unlock_value": m.unlock_value,
            "is_vip": m_is_vip,
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
    # Unlock logic removed, lessons are always open if course is accessible

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
