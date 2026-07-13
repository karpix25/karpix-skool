from datetime import datetime
from importlib.util import find_spec

from sqlmodel.ext.asyncio.session import AsyncSession

from ..config import settings
from ..models import NotebookGenerationProvider, PlatformGenerationSettings


GLOBAL_GENERATION_SETTINGS_KEY = "global"


def default_notebook_provider() -> NotebookGenerationProvider:
    return NotebookGenerationProvider(settings.NOTEBOOK_GENERATION_PROVIDER)


def google_notebooklm_configured() -> bool:
    return find_spec("notebooklm") is not None


async def get_platform_generation_settings(
    session: AsyncSession,
) -> PlatformGenerationSettings:
    record = await session.get(PlatformGenerationSettings, GLOBAL_GENERATION_SETTINGS_KEY)
    if record:
        return record

    record = PlatformGenerationSettings(
        key=GLOBAL_GENERATION_SETTINGS_KEY,
        notebook_provider=default_notebook_provider(),
    )
    session.add(record)
    await session.flush()
    return record


async def get_effective_notebook_provider(
    session: AsyncSession,
) -> NotebookGenerationProvider:
    record = await get_platform_generation_settings(session)
    return record.notebook_provider


async def update_notebook_provider(
    session: AsyncSession,
    *,
    provider: NotebookGenerationProvider,
    updated_by_user_id,
) -> PlatformGenerationSettings:
    record = await get_platform_generation_settings(session)
    record.notebook_provider = provider
    record.updated_by_user_id = updated_by_user_id
    record.updated_at = datetime.utcnow()
    session.add(record)
    await session.flush()
    return record
