import pytest
from pydantic import ValidationError

from app.schemas.agent import AgentRunCreate
from app.schemas.lesson_generation import LessonGenerationCreate


def test_source_url_validation_accepts_http_sources():
    lesson_request = LessonGenerationCreate.model_validate(
        {"source_url": "https://example.com/notebook/example"}
    )
    agent_request = AgentRunCreate.model_validate(
        {
            "tenant_id": "00000000-0000-0000-0000-000000000001",
            "course_title": "Course",
            "source_url": "https://example.com/notebook/example",
        }
    )

    assert lesson_request.notebook_url == "https://example.com/notebook/example"
    assert agent_request.notebook_url == "https://example.com/notebook/example"


@pytest.mark.parametrize(
    "url",
    [
        "ftp://example.com/notebook/example",
        "not-a-url",
        "https:///missing-host",
    ],
)
def test_source_url_validation_rejects_non_http_urls(url):
    with pytest.raises(ValidationError):
        LessonGenerationCreate.model_validate({"source_url": url})

    with pytest.raises(ValidationError):
        AgentRunCreate.model_validate(
            {
                "tenant_id": "00000000-0000-0000-0000-000000000001",
                "course_title": "Course",
                "source_url": url,
            }
        )
