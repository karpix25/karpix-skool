from typing import Any, Callable, Dict, Awaitable
from aiogram import BaseMiddleware
from aiogram.types import Message, TelegramObject, Update
from sqlalchemy.future import select
from app.db import get_session, engine
from app.models import Tenant
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import sessionmaker
import logging

class MultiTenantMiddleware(BaseMiddleware):
    async def __call__(
        self,
        handler: Callable[[TelegramObject, Dict[str, Any]], Awaitable[Any]],
        event: TelegramObject,
        data: Dict[str, Any],
    ) -> Any:
        # If we are an outer middleware on dp.update, event is an Update
        # If we are on a router, event is a Message/CallbackQuery etc.
        
        chat_id = None
        if isinstance(event, Update) and event.message:
            chat_id = event.message.chat.id
        elif isinstance(event, Message):
            chat_id = event.chat.id

        async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
        async with async_session() as session:
            data["db"] = session
            
            if chat_id:
                stmt = select(Tenant).where(
                    (Tenant.telegram_group_id == chat_id) | 
                    (Tenant.telegram_group_id_vip == chat_id)
                )
                result = await session.execute(stmt)
                tenant = result.scalars().first()
                if tenant:
                    data["tenant"] = tenant
                    logging.info(f"MW: Found tenant {tenant.name} for chat {chat_id}")

                else:
                    data["tenant"] = None
            else:
                data["tenant"] = None
            
            return await handler(event, data)
