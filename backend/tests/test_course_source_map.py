import json

import pytest

from app.services.lesson_generation.course_source_map import (
    SourceSufficiency,
    parse_course_source_map,
)
from app.services.lesson_generation.course_source_map_prompts import build_course_source_map_prompt
from app.services.lesson_generation.parser import LessonGenerationParseError


def test_parse_partial_source_map_exposes_scope_decision() -> None:
    payload = {
        "source_map": {
            "confirmed_concepts": ["Скил хранит инструкции"],
            "procedures": ["Создать файл SKILL.md"],
            "examples": [],
            "constraints": ["Не обещать автоматическую установку"],
            "contradictions": [],
            "source_gaps": ["Нет материала о публикации"],
            "excluded_topics": ["Монетизация"],
            "recommended_module_count": 2,
            "recommended_lesson_count": 5,
            "sufficiency": "partial",
            "sufficiency_reason": "Материала достаточно только для базового практикума",
        }
    }

    source_map = parse_course_source_map(json.dumps(payload, ensure_ascii=False))

    assert source_map.sufficiency is SourceSufficiency.PARTIAL
    assert source_map.can_generate_course is True
    assert source_map.needs_scope_reduction is True


def test_sufficient_source_map_needs_grounded_inventory() -> None:
    payload = {
        "confirmed_concepts": ["Одна идея"],
        "procedures": [],
        "examples": [],
        "constraints": [],
        "contradictions": [],
        "source_gaps": [],
        "excluded_topics": [],
        "recommended_module_count": 3,
        "recommended_lesson_count": 8,
        "sufficiency": "sufficient",
        "sufficiency_reason": "Источник полный",
    }

    with pytest.raises(LessonGenerationParseError, match="three grounded"):
        parse_course_source_map(json.dumps(payload))


def test_insufficient_source_map_requires_a_gap() -> None:
    payload = {
        "confirmed_concepts": [],
        "procedures": [],
        "examples": [],
        "constraints": [],
        "contradictions": [],
        "source_gaps": [],
        "excluded_topics": [],
        "recommended_module_count": 1,
        "recommended_lesson_count": 1,
        "sufficiency": "insufficient",
        "sufficiency_reason": "Недостаточно материала",
    }

    with pytest.raises(LessonGenerationParseError, match="source gap"):
        parse_course_source_map(json.dumps(payload))


def test_source_map_prompt_requires_scope_reduction_and_no_invention() -> None:
    prompt = build_course_source_map_prompt(
        course_title="Claude Code",
        source_brief="Краткий источник",
        requested_modules=6,
        requested_lessons_per_module=5,
    )

    assert "reduce the recommended counts" in prompt
    assert "Do not invent" in prompt
    assert '"sufficiency"' in prompt
