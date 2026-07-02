import os

from aiogram import Router
from aiogram.filters import Command
from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup, Message, WebAppInfo
from sqlalchemy.future import select

from app.models import Tenant, TenantMember, User
from bot.learning_messages import LEARNING_REPLY_PARSE_MODE, start_reply

router = Router()


@router.message(Command("start"))
async def cmd_start(message: Message, db):
    user_tg_id = message.from_user.id

    args = message.text.split()
    start_param = args[1] if len(args) > 1 else None

    stmt = select(User).where(User.telegram_id == user_tg_id)
    result = await db.execute(stmt)
    user = result.scalars().first()

    if not user:
        user = User(
            telegram_id=user_tg_id,
            username=message.from_user.username,
            avatar_url=None,
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)

    target_tenant = None
    if start_param:
        stmt_t = select(Tenant).where(Tenant.setup_code == start_param)
        res_t = await db.execute(stmt_t)
        target_tenant = res_t.scalars().first()

    if not target_tenant:
        stmt_m_count = select(TenantMember).where(TenantMember.user_id == user.id)
        res_m_count = await db.execute(stmt_m_count)
        if not res_m_count.scalars().first():
            stmt_fallback = select(Tenant)
            res_fallback = await db.execute(stmt_fallback)
            target_tenant = res_fallback.scalars().first()

    if target_tenant:
        stmt_m = select(TenantMember).where(
            TenantMember.user_id == user.id,
            TenantMember.tenant_id == target_tenant.id,
        )
        res_m = await db.execute(stmt_m)
        if not res_m.scalars().first():
            member = TenantMember(user_id=user.id, tenant_id=target_tenant.id)
            db.add(member)
            await db.commit()

    webapp_url = os.getenv("WEBAPP_URL", "https://karpix-skool.vercel.app")
    app_url = f"{webapp_url}?startapp={target_tenant.setup_code}" if target_tenant else webapp_url

    keyboard = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="🚀 Открыть обучение", web_app=WebAppInfo(url=app_url))]
    ])

    await message.reply(
        start_reply(target_tenant.name if target_tenant else None),
        parse_mode=LEARNING_REPLY_PARSE_MODE,
        reply_markup=keyboard,
    )
