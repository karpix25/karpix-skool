import uuid
from datetime import datetime

from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup, Message, WebAppInfo
from fastapi import HTTPException

from app.models import Course, Tenant, User
from app.services.deep_links import parse_start_param
from app.services.telegram import TelegramMembershipState
from app.services.tenant_links import safe_free_group_link_for_response
from bot.lead_funnel_access import (
    GROUP_CHECK_UNAVAILABLE,
    GROUP_JOIN_REQUIRED,
    SCHOOL_LIMIT_REACHED,
    build_web_app_url,
    can_bypass_group_check,
    free_group_membership_state,
    get_membership,
    pause_membership_if_needed,
    sync_verified_membership,
    verify_and_sync_membership,
)


COURSE_CHECK_CALLBACK_PREFIX = "course_check:"


async def handle_course_start(message: Message, db, user: User, start_param: str) -> bool:
    context = await _load_course_context(db, start_param)
    if not context:
        await message.reply("Курс не найден или больше недоступен.")
        return True

    if await verify_and_sync_membership(message.bot, db, user, context.tenant):
        await _send_course_link(message, context)
        return True

    await _send_course_offer(message, context)
    return True


async def handle_course_check_callback(callback, db, user: User) -> None:
    course_id = _course_id_from_callback(callback.data or "")
    if not course_id:
        await callback.answer("Курс не найден", show_alert=True)
        return

    context = await _load_course_context(db, f"course_{course_id}")
    if not context:
        await callback.answer("Курс не найден", show_alert=True)
        return

    membership = await get_membership(db, user, context.tenant)
    if can_bypass_group_check(membership):
        if await _send_course_link(callback.message, context):
            await callback.answer("Готово")
        else:
            await callback.answer("Не удалось отправить ссылку. Откройте курс по ссылке еще раз.", show_alert=True)
        return

    state = await free_group_membership_state(callback.bot, user.telegram_id, context.tenant)
    if state == TelegramMembershipState.verified:
        synced = await sync_verified_membership(db, user, context.tenant, membership=membership)
        if not synced:
            await callback.answer(SCHOOL_LIMIT_REACHED, show_alert=True)
            return
        if await _send_course_link(callback.message, context):
            await callback.answer("Готово")
        else:
            await callback.answer("Не удалось отправить ссылку. Откройте курс по ссылке еще раз.", show_alert=True)
        return

    if state == TelegramMembershipState.denied:
        await pause_membership_if_needed(db, user, context.tenant, membership=membership)
        await callback.answer(GROUP_JOIN_REQUIRED, show_alert=True)
        return

    await callback.answer(GROUP_CHECK_UNAVAILABLE, show_alert=True)


def is_course_start_param(start_param: str | None) -> bool:
    return bool(start_param and start_param.startswith("course_"))


def course_check_callback_data(course_id: uuid.UUID) -> str:
    return f"{COURSE_CHECK_CALLBACK_PREFIX}{course_id}"


class CourseFunnelContext:
    def __init__(self, *, course: Course, tenant: Tenant):
        self.course = course
        self.tenant = tenant
        self.start_param = f"course_{course.id}"
        self.web_app_url = build_web_app_url(self.start_param)


async def _load_course_context(db, start_param: str) -> CourseFunnelContext | None:
    try:
        payload = parse_start_param(start_param)
    except HTTPException:
        return None

    if payload.type != "course":
        return None

    course = await db.get(Course, payload.resource_id)
    if not course or course.deleted_at or not course.is_published:
        return None

    tenant = await db.get(Tenant, course.tenant_id)
    if not tenant or tenant.deleted_at:
        return None
    if tenant.subscription_status != "active":
        return None
    if tenant.expires_at and tenant.expires_at < datetime.utcnow():
        return None

    return CourseFunnelContext(course=course, tenant=tenant)


async def _send_course_offer(message: Message, context: CourseFunnelContext) -> None:
    text = (
        f"Курс: {context.course.title}\n\n"
        f"Чтобы получить доступ, вступите в бесплатную группу {context.tenant.name}. "
        "После вступления нажмите кнопку ниже."
    )
    await message.reply(text, reply_markup=_offer_keyboard(context))


async def _send_course_link(message: Message | None, context: CourseFunnelContext) -> bool:
    if not message:
        return False
    text = f"Готово. Открывайте курс: {context.course.title}"
    await message.reply(text, reply_markup=_course_keyboard(context))
    return True


def _offer_keyboard(context: CourseFunnelContext) -> InlineKeyboardMarkup:
    rows = []
    group_link = safe_free_group_link_for_response(context.tenant.free_group_link)
    if group_link:
        rows.append([InlineKeyboardButton(text="Вступить в бесплатную группу", url=group_link)])
    rows.append([
        InlineKeyboardButton(
            text="Я вступил, получить курс",
            callback_data=course_check_callback_data(context.course.id),
        )
    ])
    return InlineKeyboardMarkup(inline_keyboard=rows)


def _course_keyboard(context: CourseFunnelContext) -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="Открыть курс", web_app=WebAppInfo(url=context.web_app_url))]
    ])


def _course_id_from_callback(callback_data: str) -> uuid.UUID | None:
    if not callback_data.startswith(COURSE_CHECK_CALLBACK_PREFIX):
        return None
    raw_course_id = callback_data.removeprefix(COURSE_CHECK_CALLBACK_PREFIX)
    try:
        return uuid.UUID(raw_course_id)
    except ValueError:
        return None
