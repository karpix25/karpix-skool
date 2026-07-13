from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from ..config import settings
from ..db import get_session
from ..models import User
from ..schemas.super_admin import (
    GenerationSettingsRead,
    GenerationSettingsUpdate,
    NotebookLmAuthRead,
)
from ..services.notebooklm_auth import (
    NotebookLmAuthResult,
    check_notebooklm_auth,
    login_notebooklm_auth,
    refresh_notebooklm_auth,
)
from ..services.platform_generation_settings import (
    get_platform_generation_settings,
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
    auth_status = await check_notebooklm_auth()
    return _settings_read(record, auth_status)


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
    auth_status = await check_notebooklm_auth()
    return _settings_read(record, auth_status)


@router.get("/generation-settings/notebooklm-auth", response_model=NotebookLmAuthRead)
async def get_generation_notebooklm_auth(
    super_user: User = Depends(get_super_user),
):
    _ = super_user
    auth_status = await check_notebooklm_auth()
    return _auth_read(auth_status)


@router.post("/generation-settings/notebooklm-auth/login", response_model=NotebookLmAuthRead)
async def login_generation_notebooklm(
    super_user: User = Depends(get_super_user),
):
    _ = super_user
    auth_status = await login_notebooklm_auth()
    return _auth_read(auth_status)


@router.post("/generation-settings/notebooklm-auth/refresh", response_model=NotebookLmAuthRead)
async def refresh_generation_notebooklm(
    super_user: User = Depends(get_super_user),
):
    _ = super_user
    auth_status = await refresh_notebooklm_auth()
    return _auth_read(auth_status)


def _settings_read(record, auth_status: NotebookLmAuthResult) -> GenerationSettingsRead:
    return GenerationSettingsRead(
        notebook_provider=record.notebook_provider,
        effective_notebook_provider=record.notebook_provider,
        google_notebooklm_configured=auth_status.authenticated,
        google_notebooklm_profile=settings.NOTEBOOKLM_PROFILE,
        google_notebooklm_auth=_auth_read(auth_status),
        updated_at=record.updated_at,
    )


def _auth_read(auth_status: NotebookLmAuthResult) -> NotebookLmAuthRead:
    return NotebookLmAuthRead(
        package_installed=auth_status.package_installed,
        authenticated=auth_status.authenticated,
        profile=auth_status.profile or "default",
        status=auth_status.status,
        message=auth_status.message,
        home=auth_status.home,
        detail=auth_status.detail,
        raw=auth_status.raw,
    )
