from datetime import datetime

from sqlmodel.ext.asyncio.session import AsyncSession

from ...models_generation import NotebookLMAuthSession, NotebookLMAuthSessionStatus
from .auth_sessions import NotebookLMAuthSessionError, get_notebooklm_auth_session_by_token


async def authorize_notebooklm_remote_browser(
    *,
    session: AsyncSession,
    token: str,
) -> NotebookLMAuthSession:
    record = await get_notebooklm_auth_session_by_token(session=session, token=token)
    now = datetime.utcnow()

    if record.status == NotebookLMAuthSessionStatus.failed:
        raise NotebookLMAuthSessionError("Ссылка авторизации больше недоступна.", status_code=410)

    if record.status == NotebookLMAuthSessionStatus.expired or record.expires_at <= now:
        record.status = NotebookLMAuthSessionStatus.expired
        record.updated_at = now
        session.add(record)
        await session.commit()
        raise NotebookLMAuthSessionError("Ссылка авторизации истекла.", status_code=410)

    return record
