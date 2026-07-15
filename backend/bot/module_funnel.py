from datetime import datetime
import uuid

from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup, Message, WebAppInfo
from fastapi import HTTPException

from app.models import Course, Module, Tenant, User
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


MODULE_CHECK_CALLBACK_PREFIX = "module_check:"


async def handle_module_start(message: Message, db, user: User, start_param: str) -> bool:
    context = await _load_module_context(db, start_param)
    if not context:
        await message.reply("Модуль не найден или больше недоступен.")
        return True

    if await verify_and_sync_membership(message.bot, db, user, context.tenant):
        await _send_module_link(message, context)
        return True

    await _send_module_offer(message, context)
    return True


async def handle_module_check_callback(callback, db, user: User) -> None:
    module_id = _module_id_from_callback(callback.data or "")
    if not module_id:
        await callback.answer("Модуль не найден", show_alert=True)
        return

    context = await _load_module_context(db, f"module_{module_id}")
    if not context:
        await callback.answer("Модуль не найден", show_alert=True)
        return

    membership = await get_membership(db, user, context.tenant)
    if can_bypass_group_check(membership):
        if await _send_module_link(callback.message, context):
            await callback.answer("Готово")
        else:
            await callback.answer("Не удалось отправить ссылку. Откройте модуль по ссылке еще раз.", show_alert=True)
        return

    state = await free_group_membership_state(callback.bot, user.telegram_id, context.tenant)
    if state == TelegramMembershipState.verified:
        synced = await sync_verified_membership(db, user, context.tenant, membership=membership)
        if not synced:
            await callback.answer(SCHOOL_LIMIT_REACHED, show_alert=True)
            return
        if await _send_module_link(callback.message, context):
            await callback.answer("Готово")
        else:
            await callback.answer("Не удалось отправить ссылку. Откройте модуль по ссылке еще раз.", show_alert=True)
        return

    if state == TelegramMembershipState.denied:
        await pause_membership_if_needed(db, user, context.tenant, membership=membership)
        await callback.answer(GROUP_JOIN_REQUIRED, show_alert=True)
        return

    await callback.answer(GROUP_CHECK_UNAVAILABLE, show_alert=True)


def is_module_start_param(start_param: str | None) -> bool:
    return bool(start_param and start_param.startswith("module_"))


def module_check_callback_data(module_id: uuid.UUID) -> str:
    return f"{MODULE_CHECK_CALLBACK_PREFIX}{module_id}"


class ModuleFunnelContext:
    def __init__(self, *, module: Module, course: Course, tenant: Tenant):
        self.module = module
        self.course = course
        self.tenant = tenant
        self.start_param = f"module_{module.id}"
        self.web_app_url = build_web_app_url(self.start_param)


async def _load_module_context(db, start_param: str) -> ModuleFunnelContext | None:
    try:
        payload = parse_start_param(start_param)
    except HTTPException:
        return None

    if payload.type != "module":
        return None

    module = await db.get(Module, payload.resource_id)
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

    return ModuleFunnelContext(module=module, course=course, tenant=tenant)


async def _send_module_offer(message: Message, context: ModuleFunnelContext) -> None:
    text = (
        f"Модуль: {context.module.title}\n\n"
        f"Чтобы получить доступ, вступите в бесплатную группу {context.tenant.name}. "
        "После вступления нажмите кнопку ниже."
    )
    await message.reply(text, reply_markup=_offer_keyboard(context))


async def _send_module_link(message: Message | None, context: ModuleFunnelContext) -> bool:
    if not message:
        return False
    text = f"Готово. Открывайте модуль: {context.module.title}"
    await message.reply(text, reply_markup=_module_keyboard(context))
    return True


def _offer_keyboard(context: ModuleFunnelContext) -> InlineKeyboardMarkup:
    rows = []
    group_link = safe_free_group_link_for_response(context.tenant.free_group_link)
    if group_link:
        rows.append([InlineKeyboardButton(text="Вступить в бесплатную группу", url=group_link)])
    rows.append([
        InlineKeyboardButton(
            text="Я вступил, получить модуль",
            callback_data=module_check_callback_data(context.module.id),
        )
    ])
    return InlineKeyboardMarkup(inline_keyboard=rows)


def _module_keyboard(context: ModuleFunnelContext) -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="Открыть модуль", web_app=WebAppInfo(url=context.web_app_url))]
    ])


def _module_id_from_callback(callback_data: str) -> uuid.UUID | None:
    if not callback_data.startswith(MODULE_CHECK_CALLBACK_PREFIX):
        return None
    raw_module_id = callback_data.removeprefix(MODULE_CHECK_CALLBACK_PREFIX)
    try:
        return uuid.UUID(raw_module_id)
    except ValueError:
        return None
