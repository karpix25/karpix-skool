import asyncio
import re
from dataclasses import dataclass
from typing import Any, Optional

import httpx

from ...config import settings
from .provider import LessonGenerationClientError, TransientSourceFetchError


SCRAPE_CREATORS_TIMEOUT_SECONDS = 90
SCRAPE_CREATORS_RETRY_ATTEMPTS = 3
SCRAPE_CREATORS_RETRY_BACKOFF_SECONDS = 1.0
SCRAPE_CREATORS_RETRYABLE_STATUSES = {500, 502, 503, 504}


@dataclass(frozen=True)
class SocialVideoTranscript:
    platform: str
    url: str
    title: str
    text: str
    language: Optional[str] = None
    raw_segments: Optional[list[dict[str, Any]]] = None


class ScrapeCreatorsClient:
    def __init__(
        self,
        *,
        api_key: Optional[str] = None,
        base_url: Optional[str] = None,
        timeout_seconds: int = SCRAPE_CREATORS_TIMEOUT_SECONDS,
        retry_attempts: int = SCRAPE_CREATORS_RETRY_ATTEMPTS,
        retry_backoff_seconds: float = SCRAPE_CREATORS_RETRY_BACKOFF_SECONDS,
        transport: Optional[httpx.AsyncBaseTransport] = None,
    ):
        self.api_key = api_key if api_key is not None else settings.SCRAPE_CREATORS_API_KEY
        self.base_url = (base_url or settings.SCRAPE_CREATORS_BASE_URL).strip().rstrip("/")
        self.timeout_seconds = timeout_seconds
        self.retry_attempts = max(1, retry_attempts)
        self.retry_backoff_seconds = max(0.0, retry_backoff_seconds)
        self._transport = transport

    async def get_transcript(self, *, platform: str, url: str) -> SocialVideoTranscript:
        if platform == "youtube":
            return await self._get_youtube_transcript(url)
        if platform == "instagram":
            return await self._get_instagram_transcript(url)
        if platform == "tiktok":
            return await self._get_tiktok_transcript(url)
        raise LessonGenerationClientError(f"Unsupported social video platform: {platform}")

    async def _get_youtube_transcript(self, url: str) -> SocialVideoTranscript:
        payload = await self._request_json(
            "/v1/youtube/video/transcript",
            params=_optional_params({"url": url, "language": settings.SCRAPE_CREATORS_TRANSCRIPT_LANGUAGE}),
        )
        transcript_text = _clean_text(payload.get("transcript_only_text"))
        if not transcript_text:
            transcript_text = _youtube_segments_to_text(payload.get("transcript"))
        return SocialVideoTranscript(
            platform="youtube",
            url=str(payload.get("url") or url),
            title=f"YouTube {payload.get('type') or 'video'} transcript",
            text=_require_transcript_text(transcript_text, "YouTube"),
            language=_clean_text(payload.get("language")),
            raw_segments=payload.get("transcript") if isinstance(payload.get("transcript"), list) else None,
        )

    async def _get_instagram_transcript(self, url: str) -> SocialVideoTranscript:
        payload = await self._request_json("/v2/instagram/media/transcript", params={"url": url})
        transcripts = payload.get("transcripts")
        parts = []
        if isinstance(transcripts, list):
            for index, item in enumerate(transcripts, start=1):
                if not isinstance(item, dict):
                    continue
                text = _clean_text(item.get("text"))
                if not text:
                    continue
                label = item.get("shortcode") or item.get("id") or f"part {index}"
                parts.append(f"[{label}] {text}")
        return SocialVideoTranscript(
            platform="instagram",
            url=url,
            title="Instagram media transcript",
            text=_require_transcript_text("\n\n".join(parts), "Instagram"),
            raw_segments=transcripts if isinstance(transcripts, list) else None,
        )

    async def _get_tiktok_transcript(self, url: str) -> SocialVideoTranscript:
        payload = await self._request_json(
            "/v1/tiktok/video/transcript",
            params=_optional_params({
                "url": url,
                "language": settings.SCRAPE_CREATORS_TRANSCRIPT_LANGUAGE,
                "use_ai_as_fallback": str(settings.SCRAPE_CREATORS_TIKTOK_AI_FALLBACK).lower(),
            }),
        )
        transcript = _clean_text(payload.get("transcript"))
        return SocialVideoTranscript(
            platform="tiktok",
            url=str(payload.get("url") or url),
            title="TikTok video transcript",
            text=_require_transcript_text(_webvtt_to_text(transcript), "TikTok"),
        )

    async def _request_json(self, path: str, *, params: dict[str, str]) -> dict[str, Any]:
        if not self.api_key:
            raise LessonGenerationClientError("SCRAPE_CREATORS_API_KEY is required for social video transcripts")
        if not self.base_url:
            raise LessonGenerationClientError("SCRAPE_CREATORS_BASE_URL is not configured")

        async with httpx.AsyncClient(timeout=self.timeout_seconds, transport=self._transport) as client:
            for attempt in range(1, self.retry_attempts + 1):
                try:
                    response = await client.get(
                        f"{self.base_url}{path}",
                        headers={"x-api-key": self.api_key},
                        params=params,
                    )
                except httpx.HTTPError as exc:
                    if _is_retryable_http_error(exc):
                        if attempt < self.retry_attempts:
                            await self._wait_before_retry(attempt)
                            continue
                        raise TransientSourceFetchError(
                            _scrape_creators_request_error_message(exc, attempt)
                        ) from exc
                    raise LessonGenerationClientError(
                        _scrape_creators_request_error_message(exc, attempt)
                    ) from exc

                if response.status_code < 400:
                    break
                if _is_retryable_response(response):
                    if attempt < self.retry_attempts:
                        await self._wait_before_retry(attempt)
                        continue
                    raise TransientSourceFetchError(
                        _scrape_creators_error_message(response, attempt)
                    )
                raise LessonGenerationClientError(_scrape_creators_error_message(response, attempt))

        try:
            payload = response.json()
        except ValueError as exc:
            raise LessonGenerationClientError("ScrapeCreators returned invalid JSON") from exc
        if not isinstance(payload, dict):
            raise LessonGenerationClientError("ScrapeCreators returned an unexpected response")
        return payload

    async def _wait_before_retry(self, attempt: int) -> None:
        if self.retry_backoff_seconds <= 0:
            return
        await asyncio.sleep(self.retry_backoff_seconds * attempt)


def _youtube_segments_to_text(value: Any) -> str:
    if not isinstance(value, list):
        return ""
    lines = []
    for item in value:
        if not isinstance(item, dict):
            continue
        text = _clean_text(item.get("text"))
        if not text:
            continue
        time_label = _clean_text(item.get("startTimeText"))
        lines.append(f"[{time_label}] {text}" if time_label else text)
    return "\n".join(lines)


def _webvtt_to_text(value: str) -> str:
    lines = []
    for line in value.splitlines():
        clean_line = line.strip()
        if not clean_line or clean_line.upper() == "WEBVTT":
            continue
        if "-->" in clean_line or re.fullmatch(r"\d+", clean_line):
            continue
        lines.append(clean_line)
    return "\n".join(lines) if lines else value


def _require_transcript_text(value: str, platform_label: str) -> str:
    clean_value = _clean_text(value)
    if not clean_value:
        raise LessonGenerationClientError(f"{platform_label} transcript is empty")
    return clean_value


def _clean_text(value: Any) -> str:
    return value.strip() if isinstance(value, str) else ""


def _optional_params(params: dict[str, Optional[str]]) -> dict[str, str]:
    return {key: value for key, value in params.items() if value}


def _is_retryable_response(response: httpx.Response) -> bool:
    return response.status_code in SCRAPE_CREATORS_RETRYABLE_STATUSES


def _is_retryable_http_error(exc: httpx.HTTPError) -> bool:
    return isinstance(exc, (httpx.TimeoutException, httpx.TransportError))


def _scrape_creators_request_error_message(exc: httpx.HTTPError, attempts: int) -> str:
    message = f"ScrapeCreators request failed: {exc}"
    return _with_attempt_context(message, attempts)


def _scrape_creators_error_message(response: httpx.Response, attempts: int = 1) -> str:
    try:
        payload = response.json()
    except ValueError:
        payload = {}
    detail = payload.get("detail") or payload.get("message") or payload.get("error") or response.text[:500]
    return _with_attempt_context(f"ScrapeCreators API HTTP {response.status_code}: {detail}", attempts)


def _with_attempt_context(message: str, attempts: int) -> str:
    if attempts <= 1:
        return message
    return f"{message} after {attempts} attempts"
