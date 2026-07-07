from dataclasses import dataclass
from datetime import datetime, timedelta
import hashlib
import hmac
import html
import secrets
from typing import Optional
from urllib.parse import urljoin
import uuid

from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from ...config import settings
from ...models_generation import (
    LessonGenerationJob,
    NotebookLMAuthSession,
    NotebookLMAuthSessionStatus,
)
from ...services.telegram import get_bot
from ...utils.logging_config import logger
from .notebooklm_client import NotebookLMClientError, NotebookLMMCPClient


@dataclass(frozen=True)
class NotebookLMAuthLaunchResult:
    session: NotebookLMAuthSession
    message: str
    authenticated: bool


class NotebookLMAuthSessionError(ValueError):
    def __init__(self, message: str, *, status_code: int = 400):
        super().__init__(message)
        self.status_code = status_code


async def create_notebooklm_auth_session(
    *,
    session: AsyncSession,
    requested_by_user_id: Optional[uuid.UUID],
    job_id: Optional[uuid.UUID],
    reason: Optional[str],
) -> tuple[NotebookLMAuthSession, str]:
    token = secrets.token_urlsafe(32)
    expires_at = datetime.utcnow() + timedelta(minutes=settings.NOTEBOOKLM_AUTH_SESSION_TTL_MINUTES)
    record = NotebookLMAuthSession(
        token_hash=hash_notebooklm_auth_token(token),
        requested_by_user_id=requested_by_user_id,
        job_id=job_id,
        reason=(reason or "")[:1000] or None,
        auth_url=build_notebooklm_auth_url(token),
        expires_at=expires_at,
    )
    session.add(record)
    await session.commit()
    await session.refresh(record)
    return record, token


async def notify_super_admin_notebooklm_reauth(
    *,
    session: AsyncSession,
    job: LessonGenerationJob,
    reason: str,
) -> Optional[NotebookLMAuthSession]:
    return await send_notebooklm_auth_link_to_super_admin(
        session=session,
        requested_by_user_id=job.created_by_user_id,
        job_id=job.id,
        reason=reason,
    )


async def send_notebooklm_auth_link_to_super_admin(
    *,
    session: AsyncSession,
    requested_by_user_id: Optional[uuid.UUID],
    job_id: Optional[uuid.UUID],
    reason: str,
) -> Optional[NotebookLMAuthSession]:
    if settings.SUPER_ADMIN_ID is None:
        logger.warning("NotebookLM auth notification skipped: SUPER_ADMIN_ID is not configured")
        return None

    record, token = await create_notebooklm_auth_session(
        session=session,
        requested_by_user_id=requested_by_user_id,
        job_id=job_id,
        reason=reason,
    )
    auth_url = record.auth_url or build_notebooklm_auth_url(token)
    keyboard = InlineKeyboardMarkup(
        inline_keyboard=[
            [InlineKeyboardButton(text="Авторизовать NotebookLM", url=auth_url)],
        ]
    )
    job_line = f"Job: {job_id}\n" if job_id else ""
    text = (
        "NotebookLM требует повторную авторизацию Google.\n\n"
        f"{job_line}"
        "Нажмите кнопку ниже. Ссылка защищенная и действует "
        f"{settings.NOTEBOOKLM_AUTH_SESSION_TTL_MINUTES} минут."
    )

    bot = await get_bot()
    try:
        await bot.send_message(settings.SUPER_ADMIN_ID, text, reply_markup=keyboard)
    finally:
        await bot.session.close()

    record.notification_sent_at = datetime.utcnow()
    record.updated_at = record.notification_sent_at
    record.auth_url = auth_url
    session.add(record)
    await session.commit()
    await session.refresh(record)
    return record


async def launch_or_check_notebooklm_auth(
    *,
    session: AsyncSession,
    token: str,
    client: Optional[NotebookLMMCPClient] = None,
) -> NotebookLMAuthLaunchResult:
    record = await get_notebooklm_auth_session_by_token(session=session, token=token)
    now = datetime.utcnow()
    if record.status == NotebookLMAuthSessionStatus.completed:
        return NotebookLMAuthLaunchResult(
            record,
            "NotebookLM уже авторизован. Можно снова запускать генерацию уроков.",
            True,
        )
    if record.status == NotebookLMAuthSessionStatus.failed:
        raise NotebookLMAuthSessionError("Ссылка авторизации больше недоступна.", status_code=410)

    if record.status == NotebookLMAuthSessionStatus.expired or record.expires_at <= now:
        record.status = NotebookLMAuthSessionStatus.expired
        record.updated_at = now
        session.add(record)
        await session.commit()
        raise NotebookLMAuthSessionError("Ссылка авторизации истекла.", status_code=410)

    client = client or NotebookLMMCPClient()

    if record.status == NotebookLMAuthSessionStatus.pending:
        record.status = NotebookLMAuthSessionStatus.started
        record.used_at = record.used_at or now
        record.started_at = record.started_at or now
        record.updated_at = now
        session.add(record)
        await session.commit()

        try:
            record.setup_result_json = await client.setup_auth(show_browser=True)
        except NotebookLMClientError as exc:
            return await _mark_auth_failed(session, record, str(exc))

    try:
        health = await client.health()
    except NotebookLMClientError as exc:
        return await _mark_auth_failed(session, record, str(exc))

    record.health_json = health
    record.updated_at = datetime.utcnow()
    if health.get("authenticated") is True:
        record.status = NotebookLMAuthSessionStatus.completed
        record.completed_at = record.updated_at
        message = "NotebookLM авторизован. Можно снова запускать генерацию уроков."
        authenticated = True
    else:
        record.status = NotebookLMAuthSessionStatus.started
        message = "Окно авторизации запущено. После входа в Google обновите эту страницу."
        authenticated = False

    session.add(record)
    await session.commit()
    await session.refresh(record)
    return NotebookLMAuthLaunchResult(record, message, authenticated)


async def get_notebooklm_auth_session_by_token(
    *,
    session: AsyncSession,
    token: str,
) -> NotebookLMAuthSession:
    token_hash = hash_notebooklm_auth_token(token)
    result = await session.exec(
        select(NotebookLMAuthSession).where(NotebookLMAuthSession.token_hash == token_hash)
    )
    record = result.first()
    if not record:
        raise NotebookLMAuthSessionError("Ссылка авторизации не найдена.", status_code=404)
    return record


def hash_notebooklm_auth_token(token: str) -> str:
    return hmac.new(settings.SECRET_KEY.encode(), token.encode(), hashlib.sha256).hexdigest()


def build_notebooklm_auth_url(token: str) -> str:
    base_url = settings.NOTEBOOKLM_AUTH_PUBLIC_BASE_URL or settings.BACKEND_PUBLIC_URL
    if not base_url:
        raise NotebookLMAuthSessionError(
            "NOTEBOOKLM_AUTH_PUBLIC_BASE_URL or BACKEND_PUBLIC_URL is not configured",
            status_code=500,
        )
    return urljoin(base_url.rstrip("/") + "/", f"notebooklm/auth/{token}")


def render_notebooklm_auth_page(result: NotebookLMAuthLaunchResult) -> str:
    title = "NotebookLM авторизован" if result.authenticated else "Авторизация NotebookLM"
    escaped_message = html.escape(result.message)
    return f"""
<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{html.escape(title)}</title>
  <style>
    body {{ font-family: system-ui, sans-serif; margin: 0; padding: 32px; line-height: 1.5; }}
    main {{ max-width: 640px; margin: 0 auto; }}
    h1 {{ font-size: 24px; margin-bottom: 12px; }}
    p {{ color: #334155; }}
    .note {{ padding: 16px; border: 1px solid #cbd5e1; border-radius: 8px; background: #f8fafc; }}
  </style>
</head>
<body>
  <main>
	    <h1>{html.escape(title)}</h1>
	    <div class="note"><p>{escaped_message}</p></div>
	    <p>Логин сохраняется в серверном Chrome-профиле NotebookLM, не на этом устройстве.</p>
	  </main>
</body>
</html>
	""".strip()


def render_notebooklm_auth_error_page(message: str) -> str:
    return f"""
<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Ссылка NotebookLM недоступна</title>
  <style>
    body {{ font-family: system-ui, sans-serif; margin: 0; padding: 32px; line-height: 1.5; }}
    main {{ max-width: 640px; margin: 0 auto; }}
    h1 {{ font-size: 24px; margin-bottom: 12px; }}
    p {{ color: #334155; }}
    .note {{ padding: 16px; border: 1px solid #fecaca; border-radius: 8px; background: #fef2f2; }}
  </style>
</head>
<body>
  <main>
    <h1>Ссылка NotebookLM недоступна</h1>
    <div class="note"><p>{html.escape(message)}</p></div>
  </main>
</body>
</html>
""".strip()


async def _mark_auth_failed(
    session: AsyncSession,
    record: NotebookLMAuthSession,
    error: str,
) -> NotebookLMAuthLaunchResult:
    record.status = NotebookLMAuthSessionStatus.failed
    record.error = error[:2000]
    record.updated_at = datetime.utcnow()
    session.add(record)
    await session.commit()
    await session.refresh(record)
    return NotebookLMAuthLaunchResult(record, "Не удалось запустить авторизацию NotebookLM.", False)
