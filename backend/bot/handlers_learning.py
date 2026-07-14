import os

from aiogram import Router
from aiogram.filters import Command
from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup, Message, WebAppInfo
from sqlalchemy.future import select

from app.models import Tenant, TenantMember
from bot.learning_messages import LEARNING_REPLY_PARSE_MODE, courses_reply, leaderboard_reply

router = Router()


@router.message(Command("courses"))
async def cmd_courses(message: Message, db, tenant: Tenant | None = None):
    if not tenant:
        await message.reply("❌ Эта группа не подключена к онлайн-школе.")
        return

    webapp_url = os.getenv("WEBAPP_URL", "https://karpix-skool.vercel.app")
    app_url = f"{webapp_url}?startapp={tenant.id}"

    keyboard = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="📚 Открыть курсы", web_app=WebAppInfo(url=app_url))]
    ])

    await message.reply(
        courses_reply(tenant.name),
        parse_mode=LEARNING_REPLY_PARSE_MODE,
        reply_markup=keyboard,
    )


@router.message(Command("leaderboard"))
async def cmd_leaderboard(message: Message, db, tenant: Tenant | None = None):
    if not tenant:
        await message.reply("⚠️ Эта группа не подключена к школе.")
        return

    from sqlalchemy.orm import selectinload
    stmt = (
        select(TenantMember)
        .where(TenantMember.tenant_id == tenant.id)
        .order_by(TenantMember.xp.desc())
        .limit(10)
        .options(selectinload(TenantMember.user))
    )
    result = await db.execute(stmt)
    members = result.scalars().all()

    if not members:
        await message.reply("📉 Пока нет активности.")
        return

    await message.reply(leaderboard_reply(tenant.name, members), parse_mode=LEARNING_REPLY_PARSE_MODE)
