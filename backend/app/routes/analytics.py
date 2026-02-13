from fastapi import APIRouter, Depends
from sqlmodel import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Dict, Any
import uuid # Fixed: Use standard uuid, not from fastAPI/pydantic unless needed for type hint
from datetime import datetime, timedelta

from ..db import get_session
from ..models import User, Tenant, TenantMember, Course, LessonProgress, Lesson, Module
from .auth import get_current_user

router = APIRouter(tags=["Analytics"])

@router.get("")
async def get_analytics(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    try:
        # 1. Get Tenants owned by the user
        stmt_tenants = select(Tenant.id).where(Tenant.owner_user_id == current_user.id)
        res_tenants = await session.exec(stmt_tenants)
        tenant_ids = res_tenants.all()
        
        if not tenant_ids and not current_user.is_super_admin:
            return {
                "kpis": {
                    "total_students": 0,
                    "live_courses": 0,
                    "revenue_mtd": 0,
                    "new_joins_today": 0
                },
                "growth_activity": [0] * 24,
                "recent_activity": []
            }

        # If Super Admin, show everything? Or just for owned?
        # Usually Admin Dashboard is for THEIR schools.
        # Let's stick to owned for now, or all if Super Admin.
        
        effective_tenant_ids = tenant_ids
        if current_user.is_super_admin:
            # For super admin dashboard, maybe show global stats?
            # User requested "Admin Analytics Dashboard", usually implies the schools they manage.
            pass

        # KPI: Total Students
        stmt_students = select(func.count(TenantMember.id))
        if not current_user.is_super_admin:
            stmt_students = stmt_students.where(TenantMember.tenant_id.in_(effective_tenant_ids))
        total_students = (await session.exec(stmt_students)).one()

        # KPI: Live Courses
        stmt_courses = select(func.count(Course.id)).where(Course.is_published == True)
        if not current_user.is_super_admin:
            stmt_courses = stmt_courses.where(Course.tenant_id.in_(effective_tenant_ids))
        live_courses = (await session.exec(stmt_courses)).one()

        # KPI: New Joins Today
        today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        stmt_new_joins = select(func.count(TenantMember.id)).where(TenantMember.joined_at >= today_start)
        if not current_user.is_super_admin:
            stmt_new_joins = stmt_new_joins.where(TenantMember.tenant_id.in_(effective_tenant_ids))
        new_joins_today = (await session.exec(stmt_new_joins)).one()

        # Growth Activity (Last 24 Hours)
        # We want 24 bars.
        last_24h = datetime.utcnow() - timedelta(hours=24)
        stmt_growth = select(
            func.date_trunc('hour', TenantMember.joined_at).label('hour'),
            func.count(TenantMember.id)
        ).where(TenantMember.joined_at >= last_24h)
        
        if not current_user.is_super_admin:
            stmt_growth = stmt_growth.where(TenantMember.tenant_id.in_(effective_tenant_ids))
        
        stmt_growth = stmt_growth.group_by('hour').order_by('hour')
        res_growth = await session.exec(stmt_growth)
        growth_data = res_growth.all()
        
        # Map to 24-slot array
        growth_chart = [0] * 24
        now_hour = datetime.utcnow().replace(minute=0, second=0, microsecond=0)
        for i in range(24):
            target_hour = now_hour - timedelta(hours=23-i)
            for g_hour, count in growth_data:
                if g_hour.replace(tzinfo=None) == target_hour:
                    growth_chart[i] = count
                    break

        # Recent Activity
        # 1. Joins
        stmt_recent_joins = select(TenantMember, User).where(TenantMember.joined_at >= last_24h).join(User, TenantMember.user_id == User.id)
        if not current_user.is_super_admin:
            stmt_recent_joins = stmt_recent_joins.where(TenantMember.tenant_id.in_(effective_tenant_ids))
        stmt_recent_joins = stmt_recent_joins.order_by(TenantMember.joined_at.desc()).limit(10)
        res_joins = await session.exec(stmt_recent_joins)
        recent_joins = res_joins.all()

        # 2. Progress (Lesson Completions)
        # We need to filter completions for lessons that belong to the admin's courses
        stmt_recent_progress = select(LessonProgress, User, Lesson).join(User, LessonProgress.user_id == User.id).join(Lesson, LessonProgress.lesson_id == Lesson.id).join(Module, Lesson.module_id == Module.id).join(Course, Module.course_id == Course.id)
        
        if not current_user.is_super_admin:
            stmt_recent_progress = stmt_recent_progress.where(Course.tenant_id.in_(effective_tenant_ids))
        
        stmt_recent_progress = stmt_recent_progress.order_by(LessonProgress.completed_at.desc()).limit(10)
        res_progress = await session.exec(stmt_recent_progress)
        recent_progress = res_progress.all()

        activity_feed = []
        for member, user in recent_joins:
            activity_feed.append({
                "type": "join",
                "user_name": user.username or "Unknown",
                "avatar_url": user.avatar_url,
                "timestamp": member.joined_at.isoformat(),
                "detail": "joined the school",
                "role": member.role
            })

        for progress, user, lesson in recent_progress:
            activity_feed.append({
                "type": "progress",
                "user_name": user.username or "Unknown",
                "avatar_url": user.avatar_url,
                "timestamp": progress.completed_at.isoformat(),
                "detail": f"completed {lesson.title}"
            })

        # Sort by timestamp
        activity_feed.sort(key=lambda x: x['timestamp'], reverse=True)
        activity_feed = activity_feed[:15] # Top 15

        return {
            "kpis": {
                "total_students": total_students,
                "live_courses": live_courses,
                "revenue_mtd": 4200, # Placeholder until payment model
                "new_joins_today": new_joins_today
            },
            "growth_activity": growth_chart,
            "recent_activity": activity_feed
        }
    except Exception as e:
        from ..utils.logging_config import logger
        logger.error(f"Failed to fetch school analytics: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")
