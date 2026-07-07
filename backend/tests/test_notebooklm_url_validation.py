import pytest
from pydantic import ValidationError

from app.schemas.agent import AgentRunCreate
from app.schemas.lesson_generation import LessonGenerationCreate


def test_notebooklm_url_validation_accepts_real_domain():
    lesson_request = LessonGenerationCreate.model_validate(
        {"notebook_url": "https://notebooklm.google.com/notebook/example"}
    )
    agent_request = AgentRunCreate.model_validate(
        {
            "tenant_id": "00000000-0000-0000-0000-000000000001",
            "course_title": "Course",
            "notebook_url": "https://notebooklm.google.com/notebook/example",
        }
    )

    assert lesson_request.notebook_url == "https://notebooklm.google.com/notebook/example"
    assert agent_request.notebook_url == "https://notebooklm.google.com/notebook/example"


@pytest.mark.parametrize(
    "url",
    [
        "https://evilnotebooklm.google.com/notebook/example",
        "https://notebooklm.google.com.evil.com/notebook/example",
        "http://notebooklm.google.com/notebook/example",
    ],
)
def test_notebooklm_url_validation_rejects_lookalike_domains(url):
    with pytest.raises(ValidationError):
        LessonGenerationCreate.model_validate({"notebook_url": url})

    with pytest.raises(ValidationError):
        AgentRunCreate.model_validate(
            {
                "tenant_id": "00000000-0000-0000-0000-000000000001",
                "course_title": "Course",
                "notebook_url": url,
            }
        )
