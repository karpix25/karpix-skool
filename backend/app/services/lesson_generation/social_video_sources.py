from typing import Iterable, Optional, Protocol, Sequence
from urllib.parse import urlparse

from ...schemas.generation_sources import GenerationSourceInput, GenerationSourceKind
from ...utils.logging_config import logger
from .provider import TransientSourceFetchError
from .scrape_creators_client import ScrapeCreatorsClient, SocialVideoTranscript


SOCIAL_VIDEO_CONTENT_LIMIT = 240_000


class SocialTranscriptClient(Protocol):
    async def get_transcript(self, *, platform: str, url: str) -> SocialVideoTranscript:
        pass


async def resolve_social_video_sources(
    sources: Sequence[GenerationSourceInput],
    *,
    client: Optional[SocialTranscriptClient] = None,
) -> list[GenerationSourceInput]:
    transcript_client = client or ScrapeCreatorsClient()
    resolved_sources = []

    for source in sources:
        platform = detect_social_video_platform(source)
        if not platform or not source.url:
            resolved_sources.append(source)
            continue

        try:
            transcript = await transcript_client.get_transcript(platform=platform, url=source.url)
        except TransientSourceFetchError as exc:
            logger.warning(
                "Social transcript unavailable; falling back to original source: "
                "platform=%s url=%s error=%s",
                platform,
                source.url,
                exc,
            )
            resolved_sources.append(source)
            continue
        resolved_sources.append(_transcript_to_note_source(source, transcript))

    return resolved_sources


def detect_social_video_platform(source: GenerationSourceInput) -> Optional[str]:
    if source.kind in {
        GenerationSourceKind.youtube,
        GenerationSourceKind.instagram,
        GenerationSourceKind.tiktok,
    }:
        return source.kind.value

    if source.kind != GenerationSourceKind.link or not source.url:
        return None

    host = urlparse(source.url).netloc.lower()
    if "youtube.com" in host or "youtu.be" in host:
        return "youtube"
    if "instagram.com" in host:
        return "instagram"
    if "tiktok.com" in host:
        return "tiktok"
    return None


def _transcript_to_note_source(
    source: GenerationSourceInput,
    transcript: SocialVideoTranscript,
) -> GenerationSourceInput:
    title = source.title or transcript.title
    return GenerationSourceInput(
        kind=GenerationSourceKind.note,
        title=title[:180],
        content=_format_transcript_note(source, transcript)[:SOCIAL_VIDEO_CONTENT_LIMIT],
    )


def _format_transcript_note(
    source: GenerationSourceInput,
    transcript: SocialVideoTranscript,
) -> str:
    metadata_lines = [
        f"Platform: {transcript.platform}",
        f"Original URL: {source.url or transcript.url}",
    ]
    if transcript.language:
        metadata_lines.append(f"Language: {transcript.language}")
    if source.title:
        metadata_lines.append(f"User title: {source.title}")

    return "\n".join([
        "Social video transcript for Karpix course generation.",
        *metadata_lines,
        "",
        "Transcript:",
        transcript.text,
    ])


def has_social_video_source(sources: Iterable[GenerationSourceInput]) -> bool:
    return any(detect_social_video_platform(source) for source in sources)
