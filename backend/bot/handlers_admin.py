import logging

from aiogram import F, Router
from aiogram.types import CallbackQuery
from sqlalchemy.future import select

from app.models import User

router = Router()


@router.callback_query(F.data.startswith("approve_admin:"))
async def on_approve_admin(callback: CallbackQuery, db):
    user = await _get_callback_user(callback, db)
    if not user:
        await callback.answer("❌ Пользователь не найден", show_alert=True)
        return

    from app.models import UserAdminStatus
    user.admin_status = UserAdminStatus.approved
    db.add(user)
    await db.commit()

    await callback.message.edit_text(callback.message.text + "\n\n✅ **ОДОБРЕНО**")
    await callback.answer("Пользователь одобрен!")

    try:
        await callback.bot.send_message(
            user.telegram_id,
            "🎉 **Ваша заявка одобрена!**\n\nТеперь вы можете создать свою школу в приложении. 🚀",
        )
    except Exception as e:
        logging.error("Failed to notify user %s: %s", user.id, e)


@router.callback_query(F.data.startswith("reject_admin:"))
async def on_reject_admin(callback: CallbackQuery, db):
    user = await _get_callback_user(callback, db)
    if not user:
        await callback.answer("❌ Пользователь не найден", show_alert=True)
        return

    from app.models import UserAdminStatus
    user.admin_status = UserAdminStatus.rejected
    db.add(user)
    await db.commit()

    await callback.message.edit_text(callback.message.text + "\n\n❌ **ОТКЛОНЕНО**")
    await callback.answer("Заявка отклонена")


async def _get_callback_user(callback: CallbackQuery, db) -> User | None:
    user_id_str = callback.data.split(":")[1]
    result = await db.execute(select(User).where(User.id == user_id_str))
    return result.scalars().first()
