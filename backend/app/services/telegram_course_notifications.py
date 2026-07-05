from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup

from .telegram import get_bot


async def send_telegram_link_notification(
    telegram_id: int,
    text: str,
    button_text: str,
    url: str,
) -> None:
    bot = await get_bot()
    try:
        keyboard = InlineKeyboardMarkup(
            inline_keyboard=[
                [InlineKeyboardButton(text=button_text, url=url)],
            ]
        )
        await bot.send_message(telegram_id, text, reply_markup=keyboard)
    finally:
        await bot.session.close()
