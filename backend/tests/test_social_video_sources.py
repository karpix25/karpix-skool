import httpx
import pytest

from app.schemas.generation_sources import GenerationSourceInput, GenerationSourceKind
from app.services.lesson_generation.scrape_creators_client import ScrapeCreatorsClient, SocialVideoTranscript
from app.services.lesson_generation.social_video_sources import (
    detect_social_video_platform,
    resolve_social_video_sources,
)


@pytest.mark.asyncio
async def test_scrape_creators_client_reads_youtube_transcript():
    def handler(request: httpx.Request) -> httpx.Response:
        assert request.url.path == "/v1/youtube/video/transcript"
        assert request.url.params["url"] == "https://youtube.com/watch?v=abc"
        assert request.headers["x-api-key"] == "secret"
        return httpx.Response(200, json={
            "videoId": "abc",
            "type": "video",
            "url": "https://www.youtube.com/watch?v=abc",
            "transcript_only_text": "Useful YouTube transcript",
            "language": "English",
        })

    client = ScrapeCreatorsClient(
        api_key="secret",
        base_url="https://api.scrapecreators.test",
        transport=httpx.MockTransport(handler),
    )

    transcript = await client.get_transcript(platform="youtube", url="https://youtube.com/watch?v=abc")

    assert transcript.url == "https://www.youtube.com/watch?v=abc"
    assert transcript.text == "Useful YouTube transcript"
    assert transcript.language == "English"


@pytest.mark.asyncio
async def test_scrape_creators_client_reads_instagram_transcripts():
    def handler(request: httpx.Request) -> httpx.Response:
        assert request.url.path == "/v2/instagram/media/transcript"
        return httpx.Response(200, json={
            "success": True,
            "transcripts": [
                {"id": "1", "shortcode": "ABC", "text": "First clip"},
                {"id": "2", "shortcode": "DEF", "text": "Second clip"},
            ],
        })

    client = ScrapeCreatorsClient(
        api_key="secret",
        base_url="https://api.scrapecreators.test",
        transport=httpx.MockTransport(handler),
    )

    transcript = await client.get_transcript(platform="instagram", url="https://instagram.com/reel/ABC")

    assert "[ABC] First clip" in transcript.text
    assert "[DEF] Second clip" in transcript.text


@pytest.mark.asyncio
async def test_scrape_creators_client_strips_tiktok_webvtt():
    def handler(request: httpx.Request) -> httpx.Response:
        assert request.url.path == "/v1/tiktok/video/transcript"
        assert request.url.params["use_ai_as_fallback"] == "false"
        return httpx.Response(200, json={
            "id": "123",
            "url": "https://www.tiktok.com/@user/video/123",
            "transcript": "WEBVTT\n\n00:00:00.000 --> 00:00:01.000\nFirst line\n\n00:00:01.000 --> 00:00:02.000\nSecond line",
        })

    client = ScrapeCreatorsClient(
        api_key="secret",
        base_url="https://api.scrapecreators.test",
        transport=httpx.MockTransport(handler),
    )

    transcript = await client.get_transcript(platform="tiktok", url="https://tiktok.com/@user/video/123")

    assert transcript.text == "First line\nSecond line"


@pytest.mark.asyncio
async def test_resolve_social_video_sources_converts_detected_links_to_notes():
    class FakeTranscriptClient:
        async def get_transcript(self, *, platform: str, url: str) -> SocialVideoTranscript:
            return SocialVideoTranscript(
                platform=platform,
                url=url,
                title=f"{platform} transcript",
                text="Transcript text",
                language="English",
            )

    sources = [
        GenerationSourceInput(
            kind=GenerationSourceKind.link,
            title="Regular page",
            url="https://example.com/article",
        ),
        GenerationSourceInput(
            kind=GenerationSourceKind.link,
            title="Social video",
            url="https://www.tiktok.com/@user/video/123",
        ),
    ]

    resolved = await resolve_social_video_sources(sources, client=FakeTranscriptClient())

    assert resolved[0].kind == GenerationSourceKind.link
    assert resolved[1].kind == GenerationSourceKind.note
    assert "Original URL: https://www.tiktok.com/@user/video/123" in resolved[1].content
    assert "Transcript text" in resolved[1].content


def test_detect_social_video_platform_uses_kind_and_url_host():
    assert detect_social_video_platform(GenerationSourceInput(
        kind=GenerationSourceKind.youtube,
        url="https://youtu.be/abc",
    )) == "youtube"
    assert detect_social_video_platform(GenerationSourceInput(
        kind=GenerationSourceKind.link,
        url="https://www.instagram.com/reel/ABC/",
    )) == "instagram"
    assert detect_social_video_platform(GenerationSourceInput(
        kind=GenerationSourceKind.link,
        url="https://example.com/article",
    )) is None
