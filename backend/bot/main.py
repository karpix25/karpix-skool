import asyncio
import logging
import signal
import os
from aiogram import Bot, Dispatcher
from middleware import MultiTenantMiddleware
from handlers import router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Heartbeat file for Docker healthcheck
HEARTBEAT_FILE = "/tmp/bot_alive"

async def heartbeat():
    """Write heartbeat file every 30s so Docker knows we're alive."""
    while True:
        try:
            with open(HEARTBEAT_FILE, "w") as f:
                f.write("ok")
        except Exception:
            pass
        await asyncio.sleep(30)

async def main():
    token = os.getenv("BOT_TOKEN")
    if not token:
        logger.error("BOT_TOKEN env var is missing")
        return

    bot = Bot(token=token)
    dp = Dispatcher()

    # Register Middleware
    dp.update.outer_middleware(MultiTenantMiddleware())

    # Register Router
    dp.include_router(router)

    # Graceful shutdown on SIGTERM (Docker stop)
    loop = asyncio.get_running_loop()
    shutdown_event = asyncio.Event()

    def handle_sigterm(*_):
        logger.info("SIGTERM received, shutting down gracefully...")
        shutdown_event.set()

    loop.add_signal_handler(signal.SIGTERM, handle_sigterm)
    loop.add_signal_handler(signal.SIGINT, handle_sigterm)

    # Start heartbeat
    heartbeat_task = asyncio.create_task(heartbeat())

    logger.info("Starting Bot...")
    await bot.delete_webhook(drop_pending_updates=True)

    # Start polling in background
    polling_task = asyncio.create_task(dp.start_polling(bot))

    # Wait for shutdown signal
    await shutdown_event.wait()

    logger.info("Stopping polling...")
    await dp.stop_polling()
    heartbeat_task.cancel()

    # Cleanup
    await bot.session.close()
    logger.info("Bot stopped cleanly.")

if __name__ == "__main__":
    asyncio.run(main())
