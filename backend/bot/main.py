import asyncio
import logging
import os
from aiogram import Bot, Dispatcher
from middleware import MultiTenantMiddleware
from handlers import router

# Configure logging
logging.basicConfig(level=logging.INFO)

async def main():
    token = os.getenv("BOT_TOKEN")
    if not token:
        logging.error("BOT_TOKEN env var is missing")
        return

    bot = Bot(token=token)
    dp = Dispatcher()
    
    # Register Middleware
    dp.update.outer_middleware(MultiTenantMiddleware())
    
    # Register Router
    dp.include_router(router)

    logging.info("Starting Bot...")
    await bot.delete_webhook(drop_pending_updates=True)
    await dp.start_polling(bot)

if __name__ == "__main__":
    asyncio.run(main())
