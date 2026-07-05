import hashlib
import aiohttp
import logging
from typing import Optional
from aiogram import Bot
from ..models import User
from .upload_urls import build_uploaded_file_path
from ..utils.r2 import storage
from ..utils.logging_config import logger

async def sync_user_avatar(user: User, bot: Bot, photo_url: Optional[str] = None) -> bool:
    """
    Syncs user avatar from Telegram to R2 storage.
    If photo_url is provided (from WebApp initData), it uses it.
    Otherwise, it fetches the latest profile photo using the bot.
    """
    try:
        final_photo_url = photo_url
        
        # 1. If no URL provided (from bot), fetch latest from Telegram API
        if not final_photo_url:
            photos = await bot.get_user_profile_photos(user.telegram_id, limit=1)
            if photos.total_count > 0:
                file_id = photos.photos[0][-1].file_id
                file = await bot.get_file(file_id)
                # Construct TG file URL
                final_photo_url = f"https://api.telegram.org/file/bot{bot.token}/{file.file_path}"
        
        if not final_photo_url:
            # If still no photo, user might have no profile pic
            if user.avatar_url:
                user.avatar_url = None
                return True
            return False

        # 2. Check if we already have this photo persisted
        url_hash = hashlib.md5(final_photo_url.encode()).hexdigest()
        expected_filename = f"avatars/{user.telegram_id}_{url_hash}.jpg"
        
        current_avatar = user.avatar_url or ""
        if expected_filename in current_avatar:
            return False # Already synced

        # 3. Download and Upload to R2
        async with aiohttp.ClientSession() as session:
            async with session.get(final_photo_url) as resp:
                if resp.status == 200:
                    content = await resp.read()
                    avatar_key = storage.build_key(
                        filename=f"{user.telegram_id}_{url_hash}.jpg",
                        folder="avatars",
                        use_uuid=False
                    )
                    await storage.put_file(file_content=content, key=avatar_key)
                    user.avatar_url = build_uploaded_file_path(avatar_key)
                    return True
        return False
    except Exception as e:
        logger.error(f"AVATAR SYNC ERROR for user {user.telegram_id}: {e}")
        # Fallback to direct URL if R2 fails
        if photo_url and user.avatar_url != photo_url:
            user.avatar_url = photo_url
            return True
        return False
