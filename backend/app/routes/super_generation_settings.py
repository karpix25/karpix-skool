from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from ..config import settings
from ..db import get_session
from ..models import User
from ..schemas.super_admin import GenerationSettingsRead, GenerationSettingsUpdate
from ..services.platform_generation_settings import (
    get_platform_generation_settings,
    google_notebooklm_configured,
    update_notebook_provider,
)
from ..services.super_activity import record_super_activity
from .auth import get_super_user


router = APIRouter(tags=["super_admin"])


@router.get("/generation-settings", response_model=GenerationSettingsRead)
async def get_generation_settings(
    super_user: User = Depends(get_super_user),
    session: AsyncSession = Depends(get_session),
):
    _ = super_user
    record = await get_platform_generation_settings(session)
    return _settings_read(record)


@router.patch("/generation-settings", response_model=GenerationSettingsRead)
async def update_generation_settings(
    updates: GenerationSettingsUpdate,
    super_user: User = Depends(get_super_user),
    session: AsyncSession = Depends(get_session),
):
    record = await update_notebook_provider(
        session,
        provider=updates.notebook_provider,
        updated_by_user_id=super_user.id,
    )
    await record_super_activity(
        session,
        event_type="generation.provider_updated",
        title="Режим генерации изменен",
        message=f"Notebook provider переключен на {record.notebook_provider.value}.",
        tone="warning",
        actor_user_id=super_user.id,
        target_type="platform_generation_settings",
        target_id=record.key,
        meta={"notebook_provider": record.notebook_provider.value},
    )
    await session.commit()
    await session.refresh(record)
    return _settings_read(record)


def _settings_read(record) -> GenerationSettingsRead:
    return GenerationSettingsRead(
        notebook_provider=record.notebook_provider,
        effective_notebook_provider=record.notebook_provider,
        google_notebooklm_configured=google_notebooklm_configured(),
        google_notebooklm_profile=settings.NOTEBOOKLM_PROFILE,
        updated_at=record.updated_at,
    )
