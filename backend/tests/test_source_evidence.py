from app.services.lesson_generation.course_structure_stage_payloads import LessonSourcePackPayload
import json

import pytest

from app.services.lesson_generation.parser import LessonGenerationParseError
from app.services.lesson_generation.source_evidence import (
    LessonEvidencePack,
    SourceEvidenceItem,
    legacy_source_pack_to_evidence,
    parse_lesson_evidence_pack,
    verify_evidence_pack,
)


def _item(**overrides: object) -> SourceEvidenceItem:
    values = {
        "kind": "fact",
        "claim": "SKILL.md содержит инструкции",
        "quote": "Файл SKILL.md содержит инструкции для агента.",
        "source_id": "source:1",
        "source_title": "Руководство",
        "location_hint": "Раздел 2",
        "lesson_use": "Объяснить назначение файла",
    }
    values.update(overrides)
    return SourceEvidenceItem.model_validate(values)


def test_verifier_accepts_normalized_quote_in_known_source() -> None:
    pack = LessonEvidencePack(evidence=[_item()])
    contexts = [
        {
            "source_id": "source:1",
            "full_text": "Введение\n\nФАЙЛ skill.md   содержит инструкции для агента. Конец.",
        }
    ]

    report = verify_evidence_pack(pack, contexts)

    assert report.is_valid is True
    assert report.verified_indices == [0]


def test_verifier_reports_unknown_id_before_quote_check() -> None:
    pack = LessonEvidencePack(evidence=[_item(source_id="source:missing")])

    report = verify_evidence_pack(pack, [{"source_id": "source:1", "full_text": "text"}])

    assert report.is_valid is False
    assert report.issues[0].code == "unknown_source_id"


def test_verifier_reports_quote_not_found() -> None:
    pack = LessonEvidencePack(evidence=[_item()])

    report = verify_evidence_pack(pack, [{"source_id": "source:1", "full_text": "Другой текст"}])

    assert report.issues[0].code == "quote_not_found"


def test_legacy_source_pack_adapter_preserves_content_as_uncited_partial_evidence() -> None:
    legacy = LessonSourcePackPayload(
        facts=["Факт из старого pack"],
        process_steps=["Первый шаг"],
        examples=[],
        constraints=["Ограничение"],
        source_gaps=["Нет цитат"],
    )

    adapted = legacy_source_pack_to_evidence(legacy)

    assert adapted.sufficiency == "partial"
    assert [item.claim for item in adapted.evidence] == [
        "Факт из старого pack",
        "Первый шаг",
        "Ограничение",
    ]
    assert all(item.source_id == "legacy:uncited" for item in adapted.evidence)


def test_parse_lesson_evidence_pack_unwraps_payload() -> None:
    raw = json.dumps({"evidence_pack": {"evidence": [_item().model_dump(mode="json")]}})

    parsed = parse_lesson_evidence_pack(raw)

    assert parsed.evidence[0].source_id == "source:1"


def test_insufficient_evidence_pack_requires_source_gap() -> None:
    with pytest.raises(LessonGenerationParseError, match="source gap"):
        parse_lesson_evidence_pack('{"evidence": [], "sufficiency": "insufficient"}')
