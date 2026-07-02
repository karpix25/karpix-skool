from fastapi import APIRouter, Depends
from sqlmodel import select, func, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Dict, Any
import uuid 
from datetime import datetime, timedelta

from ..db import get_session
from ..models import User, Tenant, TenantMember, Course, LessonProgress, Lesson, Module, MemberStatus
from ..services.tenant_access import TENANT_MANAGEMENT_ROLES
from .auth import get_current_user

router = APIRouter(tags=["Analytics"])

@router.get("")
async def get_analytics(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    try:
        # 1. Get all tenants where the user has an admin/owner role (unified logic)
        # Using a logic similar to tenants.py list_my_tenants
        stmt_tenants = select(Tenant.id).where(
            or_(
                Tenant.owner_user_id == current_user.id,
                Tenant.id.in_(
                    select(TenantMember.tenant_id).where(
                        TenantMember.user_id == current_user.id,
                        TenantMember.role.in_(TENANT_MANAGEMENT_ROLES),
                        TenantMember.status == MemberStatus.active,
                        TenantMember.deleted_at == None
                    )
                )
            ),
            Tenant.deleted_at == None
        )
        
        res_tenants = await session.exec(stmt_tenants)
        tenant_ids = res_tenants.all()
        
        if not tenant_ids and not current_user.is_super_admin:
            return {
                "kpis": {
                    "total_students": 0,
                    "total_students_growth": 0,
                    "live_courses": 0,
                    "revenue_mtd": 0,
                    "new_joins_today": 0
                },
                "growth_activity": [0] * 24,
                "recent_activity": []
            }

        effective_tenant_ids = tenant_ids

        # KPI: Total Students
        stmt_students = select(func.count(TenantMember.id)).where(TenantMember.deleted_at == None)
        if not current_user.is_super_admin:
            stmt_students = stmt_students.where(TenantMember.tenant_id.in_(effective_tenant_ids))
        total_students = (await session.exec(stmt_students)).one()

        # KPI: Live Courses
        stmt_courses = select(func.count(Course.id)).where(
            Course.is_published == True,
            Course.deleted_at == None
        )
        if not current_user.is_super_admin:
            stmt_courses = stmt_courses.where(Course.tenant_id.in_(effective_tenant_ids))
        live_courses = (await session.exec(stmt_courses)).one()

        # KPI: New Joins Today
        today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        stmt_new_joins = select(func.count(TenantMember.id)).where(
            TenantMember.joined_at >= today_start,
            TenantMember.deleted_at == None
        )
        if not current_user.is_super_admin:
            stmt_new_joins = stmt_new_joins.where(TenantMember.tenant_id.in_(effective_tenant_ids))
        new_joins_today = (await session.exec(stmt_new_joins)).one()

        # Growth Activity (Last 24 Hours)
        last_24h = datetime.utcnow() - timedelta(hours=24)
        stmt_growth = select(
            func.date_trunc('hour', TenantMember.joined_at).label('hour'),
            func.count(TenantMember.id)
        ).where(
            TenantMember.joined_at >= last_24h,
            TenantMember.deleted_at == None
        )
        
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
        stmt_recent_joins = select(TenantMember, User).where(
            TenantMember.joined_at >= last_24h,
            TenantMember.deleted_at == None
        ).join(User, TenantMember.user_id == User.id)
        
        if not current_user.is_super_admin:
            stmt_recent_joins = stmt_recent_joins.where(TenantMember.tenant_id.in_(effective_tenant_ids))
        stmt_recent_joins = stmt_recent_joins.order_by(TenantMember.joined_at.desc()).limit(10)
        res_joins = await session.exec(stmt_recent_joins)
        recent_joins = res_joins.all()

        # 2. Progress (Lesson Completions)
        stmt_recent_progress = (
            select(LessonProgress, User, Lesson)
            .join(User, LessonProgress.user_id == User.id)
            .join(Lesson, LessonProgress.lesson_id == Lesson.id)
            .join(Module, Lesson.module_id == Module.id)
            .join(Course, Module.course_id == Course.id)
            .where(
                Course.deleted_at == None,
                Module.deleted_at == None,
                Lesson.deleted_at == None
            )
        )
        
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

        activity_feed.sort(key=lambda x: x['timestamp'], reverse=True)
        activity_feed = activity_feed[:15]

        # Calculate growth percentage
        total_students_growth = 0
        if total_students > new_joins_today and (total_students - new_joins_today) > 0:
            total_students_growth = int((new_joins_today / (total_students - new_joins_today)) * 100)
        elif total_students > 0 and total_students == new_joins_today:
            total_students_growth = 100

        return {
            "kpis": {
                "total_students": total_students,
                "total_students_growth": total_students_growth,
                "live_courses": live_courses,
                "revenue_mtd": 0, # Still placeholder
                "new_joins_today": new_joins_today
            },
            "growth_activity": growth_chart,
            "recent_activity": activity_feed
        }
    except Exception as e:
        from ..utils.logging_config import logger
        logger.error(f"Failed to fetch school analytics: {e}")
        from fastapi import HTTPException
        raise HTTPException(status_code=500, detail="Internal server error")
