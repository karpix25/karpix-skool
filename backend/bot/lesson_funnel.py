from datetime import datetime
import uuid
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup, Message, WebAppInfo
from fastapi import HTTPException
from sqlalchemy.future import select

from app.config import settings
from app.models import Course, Lesson, MemberRole, MemberStatus, Module, Tenant, TenantMember, User
from app.services.deep_links import parse_start_param
from app.services.telegram import TelegramMembershipState, check_user_chat_membership_state
from app.services.tenant_links import safe_free_group_link_for_response


LESSON_CHECK_CALLBACK_PREFIX = "lesson_check:"
MANAGER_ROLES = {MemberRole.owner, MemberRole.admin, MemberRole.moderator}
_MEMBERSHIP_NOT_LOADED = object()
GROUP_CHECK_UNAVAILABLE = (
    "Не удалось проверить вступление в группу. "
    "Попробуйте еще раз чуть позже или напишите администратору."
)
GROUP_JOIN_REQUIRED = "Пока не вижу вас в группе. Вступите и нажмите кнопку еще раз."


async def handle_lesson_start(message: Message, db, user: User, start_param: str) -> bool:
    context = await _load_lesson_context(db, start_param)
    if not context:
        await message.reply("Урок не найден или больше недоступен.")
        return True

    if await _verify_and_sync_membership(message.bot, db, user, context.tenant):
        await _send_lesson_link(message, context)
        return True

    await _send_lesson_offer(message, context)
    return True


async def handle_lesson_check_callback(callback, db, user: User) -> None:
    lesson_id = _lesson_id_from_callback(callback.data or "")
    if not lesson_id:
        await callback.answer("Урок не найден", show_alert=True)
        return

    context = await _load_lesson_context(db, f"lesson_{lesson_id}")
    if not context:
        await callback.answer("Урок не найден", show_alert=True)
        return

    membership = await _get_membership(db, user, context.tenant)
    if _can_bypass_group_check(membership):
        if await _send_lesson_link(callback.message, context):
            await callback.answer("Готово")
        else:
            await callback.answer("Не удалось отправить ссылку. Откройте урок по ссылке еще раз.", show_alert=True)
        return

    state = await _free_group_membership_state(callback.bot, user.telegram_id, context.tenant)
    if state == TelegramMembershipState.verified:
        await _sync_verified_membership(db, user, context.tenant, membership=membership)
        if await _send_lesson_link(callback.message, context):
            await callback.answer("Готово")
        else:
            await callback.answer("Не удалось отправить ссылку. Откройте урок по ссылке еще раз.", show_alert=True)
        return

    if state == TelegramMembershipState.denied:
        await _pause_membership_if_needed(db, user, context.tenant, membership=membership)
        await callback.answer(GROUP_JOIN_REQUIRED, show_alert=True)
        return

    await callback.answer(GROUP_CHECK_UNAVAILABLE, show_alert=True)


def is_lesson_start_param(start_param: str | None) -> bool:
    return bool(start_param and start_param.startswith("lesson_"))


def lesson_check_callback_data(lesson_id: uuid.UUID) -> str:
    return f"{LESSON_CHECK_CALLBACK_PREFIX}{lesson_id}"


class LessonFunnelContext:
    def __init__(self, *, lesson: Lesson, course: Course, tenant: Tenant):
        self.lesson = lesson
        self.course = course
        self.tenant = tenant
        self.start_param = f"lesson_{lesson.id}"
        self.web_app_url = _build_web_app_url(self.start_param)


async def _load_lesson_context(db, start_param: str) -> LessonFunnelContext | None:
    try:
        payload = parse_start_param(start_param)
    except HTTPException:
        return None

    if payload.type != "lesson":
        return None

    lesson = await db.get(Lesson, payload.resource_id)
    if not lesson or lesson.deleted_at or not lesson.is_published:
        return None

    module = await db.get(Module, lesson.module_id)
    if not module or module.deleted_at:
        return None

    course = await db.get(Course, module.course_id)
    if not course or course.deleted_at or not course.is_published:
        return None

    tenant = await db.get(Tenant, course.tenant_id)
    if not tenant or tenant.deleted_at:
        return None
    if tenant.subscription_status != "active":
        return None
    if tenant.expires_at and tenant.expires_at < datetime.utcnow():
        return None

    return LessonFunnelContext(lesson=lesson, course=course, tenant=tenant)


async def _verify_and_sync_membership(bot, db, user: User, tenant: Tenant) -> bool:
    membership = await _get_membership(db, user, tenant)
    if _can_bypass_group_check(membership):
        return True

    state = await _free_group_membership_state(bot, user.telegram_id, tenant)
    if state == TelegramMembershipState.verified:
        await _sync_verified_membership(db, user, tenant, membership=membership)
        return True
    if state == TelegramMembershipState.denied:
        await _pause_membership_if_needed(db, user, tenant, membership=membership)
    return False


async def _free_group_membership_state(bot, telegram_id: int | None, tenant: Tenant) -> TelegramMembershipState:
    if not telegram_id or not tenant.telegram_group_id:
        return TelegramMembershipState.unknown
    check = await check_user_chat_membership_state(telegram_id, tenant.telegram_group_id, bot)
    return check.state


async def _sync_verified_membership(
    db,
    user: User,
    tenant: Tenant,
    *,
    membership=_MEMBERSHIP_NOT_LOADED,
) -> TenantMember:
    if membership is _MEMBERSHIP_NOT_LOADED:
        membership = await _get_membership(db, user, tenant)
    if membership:
        if membership.status == MemberStatus.paused:
            membership.status = MemberStatus.active
            membership.paused_at = None
        db.add(membership)
        await db.commit()
        return membership

    membership = TenantMember(
        user_id=user.id,
        tenant_id=tenant.id,
        role=MemberRole.student,
        status=MemberStatus.active,
    )
    db.add(membership)
    await db.commit()
    return membership


async def _pause_membership_if_needed(
    db,
    user: User,
    tenant: Tenant,
    *,
    membership=_MEMBERSHIP_NOT_LOADED,
) -> None:
    if membership is _MEMBERSHIP_NOT_LOADED:
        membership = await _get_membership(db, user, tenant)
    if not membership or membership.status == MemberStatus.paused:
        return
    if _can_bypass_group_check(membership):
        return

    membership.status = MemberStatus.paused
    membership.paused_at = datetime.utcnow()
    db.add(membership)
    await db.commit()


async def _get_membership(db, user: User, tenant: Tenant) -> TenantMember | None:
    result = await db.execute(
        select(TenantMember).where(
            TenantMember.user_id == user.id,
            TenantMember.tenant_id == tenant.id,
            TenantMember.deleted_at == None,
        )
    )
    return result.scalars().first()


def _can_bypass_group_check(membership: TenantMember | None) -> bool:
    return bool(
        membership
        and membership.status == MemberStatus.active
        and membership.role in MANAGER_ROLES
    )


async def _send_lesson_offer(message: Message, context: LessonFunnelContext) -> None:
    text = (
        f"Урок: {context.lesson.title}\n\n"
        f"Чтобы получить доступ, вступите в бесплатную группу {context.tenant.name}. "
        "После вступления нажмите кнопку ниже."
    )
    await message.reply(text, reply_markup=_offer_keyboard(context))


async def _send_lesson_link(message: Message | None, context: LessonFunnelContext) -> bool:
    if not message:
        return False
    text = f"Готово. Открывайте урок: {context.lesson.title}"
    await message.reply(text, reply_markup=_lesson_keyboard(context))
    return True


def _offer_keyboard(context: LessonFunnelContext) -> InlineKeyboardMarkup:
    rows = []
    group_link = safe_free_group_link_for_response(context.tenant.free_group_link)
    if group_link:
        rows.append([InlineKeyboardButton(text="Вступить в бесплатную группу", url=group_link)])
    rows.append([
        InlineKeyboardButton(
            text="Я вступил, получить урок",
            callback_data=lesson_check_callback_data(context.lesson.id),
        )
    ])
    return InlineKeyboardMarkup(inline_keyboard=rows)


def _lesson_keyboard(context: LessonFunnelContext) -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="Открыть урок", web_app=WebAppInfo(url=context.web_app_url))]
    ])


def _build_web_app_url(start_param: str) -> str:
    base_url = (settings.WEBAPP_URL or settings.FRONTEND_URL).strip()
    parsed = urlsplit(base_url)
    query = dict(parse_qsl(parsed.query, keep_blank_values=True))
    query["startapp"] = start_param
    return urlunsplit((
        parsed.scheme,
        parsed.netloc,
        parsed.path,
        urlencode(query),
        parsed.fragment,
    ))


def _lesson_id_from_callback(callback_data: str) -> uuid.UUID | None:
    if not callback_data.startswith(LESSON_CHECK_CALLBACK_PREFIX):
        return None
    raw_lesson_id = callback_data.removeprefix(LESSON_CHECK_CALLBACK_PREFIX)
    try:
        return uuid.UUID(raw_lesson_id)
    except ValueError:
        return None
