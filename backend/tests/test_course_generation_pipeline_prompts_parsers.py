import pytest

from app.services.course_generation_pipeline.parsers import (
    CourseGenerationParseError,
    parse_course_blueprint,
    parse_humanized_lesson,
    parse_lesson_draft,
    parse_media_plan,
)
from app.services.course_generation_pipeline.prompts.blueprint import (
    CourseBlueprintPromptInput,
    build_course_blueprint_prompt,
)
from app.services.course_generation_pipeline.prompts.humanizer import (
    HumanizerPromptInput,
    build_humanizer_prompt,
)
from app.services.course_generation_pipeline.prompts.lesson_draft import (
    LessonDraftPromptInput,
    build_lesson_draft_prompt,
)
from app.services.course_generation_pipeline.prompts.media_plan import (
    MediaPlanPromptInput,
    build_media_plan_prompt,
)


def test_blueprint_prompt_sets_fact_boundary_and_methodology():
    prompt = build_course_blueprint_prompt(
        CourseBlueprintPromptInput(
            course_title="AI Ops",
            module_count=3,
            lessons_per_module=2,
            audience="founders",
            transformation_goal="launch an AI-assisted workflow",
        )
    )

    assert "Use only facts present in the Open Notebook source context" in prompt
    assert "backward design" in prompt
    assert "Merrill's First Principles" in prompt
    assert "Create exactly 3 modules" in prompt
    assert "Create up to 2 lessons per module" in prompt


def test_lesson_draft_prompt_requires_source_grounded_json():
    prompt = build_lesson_draft_prompt(
        LessonDraftPromptInput(
            course_title="AI Ops",
            module_title="Setup",
            lesson_title="Connect sources",
            learning_outcome="connect source material safely",
            style="practical",
        )
    )

    assert "Use only facts present in the Open Notebook source context" in prompt
    assert "Return valid JSON only" in prompt
    assert "Connect sources" in prompt
    assert "source_gaps" in prompt


def test_humanizer_prompt_forbids_new_facts():
    prompt = build_humanizer_prompt(
        HumanizerPromptInput(
            title="Connect sources",
            draft_html="<h2>Setup</h2><p>Fact from source.</p>",
            audience="beginners",
        )
    )

    assert "Do not add facts" in prompt
    assert "Do not introduce new examples" in prompt
    assert "<p>Fact from source.</p>" in prompt
    assert "Return valid JSON only" in prompt


def test_media_plan_prompt_keeps_assets_source_grounded():
    prompt = build_media_plan_prompt(
        MediaPlanPromptInput(
            course_title="AI Ops",
            lesson_titles=["Connect sources", "Review drafts"],
        )
    )

    assert "Use only facts present in the Open Notebook source context" in prompt
    assert "Do not invent visuals" in prompt
    assert "1. Connect sources" in prompt
    assert "2. Review drafts" in prompt


def test_parse_course_blueprint_extracts_fenced_json_and_aliases():
    payload = parse_course_blueprint(
        """
        ```json
        {
          "blueprint": {
            "title": "AI Ops",
            "modules": [
              {
                "title": "Setup",
                "outcome": "Learner can connect source material",
                "lessons": [
                  {
                    "title": "Connect sources",
                    "outcome": "Learner can attach a source"
                  }
                ]
              }
            ]
          }
        }
        ```
        """
    )

    assert payload.course_title == "AI Ops"
    assert payload.modules[0].transformation_outcome == "Learner can connect source material"
    assert payload.modules[0].lessons[0].learning_outcome == "Learner can attach a source"


def test_parse_course_blueprint_reports_missing_fields():
    with pytest.raises(CourseGenerationParseError) as exc_info:
        parse_course_blueprint('{"modules": [{"title": "Setup", "lessons": []}]}')

    assert "course blueprint" in str(exc_info.value)
    assert "transformation_outcome" in str(exc_info.value)


def test_parse_lesson_draft_allows_raw_newlines_inside_html_string():
    payload = parse_lesson_draft(
        '{ "title": "Draft", "outcome": "Learner can apply the idea", '
        '"html": "<h2>Idea</h2><p>Line one\nLine two</p>" }'
    )

    assert payload.learning_outcome == "Learner can apply the idea"
    assert payload.html == "<h2>Idea</h2><p>Line one\nLine two</p>"


def test_parse_humanized_lesson_requires_html():
    with pytest.raises(CourseGenerationParseError) as exc_info:
        parse_humanized_lesson('{"title": "Draft"}')

    assert "humanized lesson" in str(exc_info.value)
    assert "html" in str(exc_info.value)


def test_parse_media_plan_accepts_prefixed_nested_payload():
    payload = parse_media_plan(
        """
        Here is the plan:
        {
          "media_plan": {
            "items": [
              {
                "title": "Connect sources",
                "media_type": "screenshot",
                "purpose": "Show the exact admin action",
                "description": "Capture the source upload screen",
                "source_basis": "The source explains upload setup"
              }
            ]
          }
        }
        """
    )

    item = payload.items[0]
    assert item.lesson_title == "Connect sources"
    assert item.instruction == "Capture the source upload screen"


def test_parse_media_plan_accepts_root_array():
    payload = parse_media_plan(
        """
        [
          {
            "lesson_title": "Review drafts",
            "media_type": "none",
            "purpose": "Text is enough",
            "instruction": "No asset needed"
          }
        ]
        """
    )

    assert payload.items[0].media_type == "none"
