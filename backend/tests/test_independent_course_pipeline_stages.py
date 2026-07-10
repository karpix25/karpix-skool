import json
import uuid

import pytest

from app.models_generation import CourseStructureGenerationJob
from app.services.lesson_generation.course_structure_planner import CourseStructurePlanner
from app.services.lesson_generation.course_structure_stage_payloads import (
    CourseBlueprintPayload,
    ProductCourseStrategyPayload,
)
from app.services.lesson_generation.lesson_draft_pipeline import (
    LessonDraftPipeline,
    LessonDraftStageError,
    LessonDraftStatus,
)
from app.services.lesson_generation.lesson_review_service import LessonReviewService


class FakeGenerator:
    provider_name = "fake"
    resolved_model_name = "fake-model"

    def __init__(self, answers):
        self.answers = [answer if isinstance(answer, str) else json.dumps(answer) for answer in answers]
        self.prompts = []

    async def generate_text(self, prompt):
        self.prompts.append(prompt)
        return self.answers.pop(0)


class FakeProvider:
    def __init__(self, response):
        self.response = response
        self.calls = []

    async def ask_from_sources(self, **kwargs):
        self.calls.append(kwargs)
        return self.response


def _job():
    return CourseStructureGenerationJob(
        tenant_id=uuid.uuid4(),
        course_id=uuid.uuid4(),
        created_by_user_id=uuid.uuid4(),
        notebook_url="notebook:course",
        module_count=1,
        lessons_per_module=1,
    )


def _strategy():
    return {
        "product_promise": "Собрать первый проверяемый оффер для клиента.",
        "target_student": "Новичок без готового оффера.",
        "start_state": "Есть идея услуги, но нет проверяемого предложения.",
        "end_state": "Есть оффер и сценарий проверки спроса.",
        "final_project": "Пакет запуска проверяемого клиентского оффера.",
        "course_angle": "Один практический путь от идеи к проверке.",
        "proof_boundary": "Не обещать результат без подтверждения источником.",
        "module_progression_logic": ["Собрать оффер.", "Проверить спрос."],
    }


def _blueprint():
    return {
        "transformation_goal": "Собрать и проверить первый оффер.",
        "target_student": "Новичок без готового оффера.",
        "start_state": "Есть идея, но нет структуры предложения.",
        "end_state": "Есть готовый оффер и проверочный вопрос.",
        "final_project": "Пакет запуска проверяемого клиентского оффера.",
        "modules": [{
            "title": "Упаковка оффера",
            "module_outcome": "Ученик собирает предложение для проверки.",
            "final_project_piece": "Готовый черновик клиентского оффера.",
            "lessons": [{
                "title": "Связка боли и результата",
                "learning_outcome": "Связать боль клиента с результатом услуги.",
                "student_deliverable": "Таблица боли, результата и ограничения.",
                "source_focus": "Боль клиента, результат и проверка спроса.",
                "course_path_bridge": "Таблица станет основой следующей проверки спроса.",
                "media_placeholders": ["TABLE: боль -> результат -> ограничение"],
            }],
        }],
    }


def _lesson(title="Связка боли и результата"):
    detail = (
        "Ученик берет подтвержденную боль клиента, связывает ее с наблюдаемым результатом, "
        "проверяет границы обещания и сохраняет решение в рабочей таблице. "
    )
    return {
        "title": title,
        "icon_emoji": "🎯",
        "html": f"""
<h2>Карта клиентской боли</h2><p>{detail * 3}</p><p>{detail * 2}</p>
<h2>Граница обещания</h2><p>{detail * 3}</p><p>{detail * 2}</p>
<h2>Сценарий проверки</h2><p>{detail * 3}</p>
<p><strong>Визуал:</strong> добавьте таблицу боли, результата и ограничения после этого абзаца.</p>
<ul><li>выберите одну боль клиента.</li><li>сформулируйте наблюдаемый результат.</li><li>запишите ограничение обещания.</li></ul>
<h2>Артефакт для продолжения</h2><p>{detail * 3}</p>
<p>Сохраните таблицу как готовый артефакт. На следующем шаге она станет основой проверки спроса.</p>
""".strip(),
        "media_plan": ["Таблица: боль -> результат -> ограничение"],
    }


def _review(score=90, issues=None):
    return {"review": {
        "scores": {name: score for name in (
            "source_grounding", "goal_alignment", "practice_alignment",
            "artifact_quality", "course_continuity", "clarity",
        )},
        "issues": issues or [],
        "summary": "Урок соответствует evidence pack.",
    }}


def _source_response(quote="Источник связывает боль клиента с наблюдаемым результатом."):
    items = [
        {
            "kind": kind,
            "claim": claim,
            "quote": quote,
            "source_id": "source:1",
            "source_title": "Оффер",
            "lesson_use": claim,
        }
        for kind, claim in (
            ("fact", "Оффер начинается с боли клиента."),
            ("process_step", "Свяжите боль с наблюдаемым результатом."),
            ("constraint", "Не обещайте неподтвержденный результат."),
        )
    ]
    return {
        "answer": json.dumps({"evidence_pack": {"evidence": items, "sufficiency": "sufficient"}}),
        "source_contexts": [{"source_id": "source:1", "full_text": quote}],
        "notebook_id": "notebook:course",
    }


@pytest.mark.asyncio
async def test_planner_retries_strategy_and_returns_stage_audit():
    generator = FakeGenerator(["{}", _strategy(), _blueprint()])
    result = await CourseStructurePlanner(text_generator=generator, attempts=2).plan(
        source_brief="Источник описывает оффер и проверку спроса.",
        job=_job(),
        course_title="Первый оффер",
    )

    assert result.blueprint.modules[0].title == "Упаковка оффера"
    assert result.audit["strategy_generation"]["attempts"] == 2
    assert len(result.audit["strategy_generation"]["attempt_errors"]) == 1
    assert "Product strategy to follow" in generator.prompts[-1]


@pytest.mark.asyncio
async def test_lesson_pipeline_verifies_cited_evidence_and_returns_ready():
    blueprint = CourseBlueprintPayload.model_validate(_blueprint())
    writer = FakeGenerator([_lesson()])
    reviewer_generator = FakeGenerator([_review()])
    provider = FakeProvider(_source_response())
    pipeline = LessonDraftPipeline(
        writer=writer,
        reviewer=LessonReviewService(text_generator=reviewer_generator),
        attempts=1,
    )

    result = await pipeline.generate(
        client=provider,
        sources=[],
        notebook_id="notebook:course",
        source_brief="Источник описывает оффер.",
        course_title="Первый оффер",
        module=blueprint.modules[0],
        lesson=blueprint.modules[0].lessons[0],
        product_strategy=ProductCourseStrategyPayload.model_validate(_strategy()),
    )

    assert result.status is LessonDraftStatus.READY
    assert result.audit["source"]["format"] == "cited_evidence"
    assert result.audit["source"]["verification"]["verified_indices"] == [0, 1, 2]
    assert len(writer.prompts) == 1
    assert len(reviewer_generator.prompts) == 1


@pytest.mark.asyncio
async def test_lesson_pipeline_allows_only_one_review_revision():
    blueprint = CourseBlueprintPayload.model_validate(_blueprint())
    writer = FakeGenerator([_lesson(), _lesson()])
    reviewer_generator = FakeGenerator([
        _review(70, [{
            "code": "missing_success_criteria",
            "message": "Нет критерия готовности.",
            "repair_instruction": "Добавить проверяемый критерий.",
        }]),
        _review(70, [{
            "code": "missing_success_criteria",
            "message": "Критерий все еще слабый.",
        }]),
    ])
    result = await LessonDraftPipeline(
        writer=writer,
        reviewer=LessonReviewService(text_generator=reviewer_generator),
        attempts=1,
    ).generate(
        client=FakeProvider(_source_response()),
        sources=[], notebook_id="notebook:course", source_brief="Источник",
        course_title="Первый оффер", module=blueprint.modules[0],
        lesson=blueprint.modules[0].lessons[0],
        product_strategy=ProductCourseStrategyPayload.model_validate(_strategy()),
    )

    assert result.status is LessonDraftStatus.NEEDS_REVIEW
    assert result.audit["review_revision_used"] is True
    assert len(writer.prompts) == 2
    assert len(reviewer_generator.prompts) == 2
    assert "one bounded revision" in writer.prompts[1]


@pytest.mark.asyncio
async def test_lesson_pipeline_blocks_unverified_quote_before_writing():
    blueprint = CourseBlueprintPayload.model_validate(_blueprint())
    response = _source_response(quote="Точная подтвержденная цитата.")
    response["source_contexts"][0]["full_text"] = "Другой текст источника."
    pipeline = LessonDraftPipeline(
        writer=FakeGenerator([]),
        reviewer=LessonReviewService(text_generator=FakeGenerator([])),
    )

    with pytest.raises(LessonDraftStageError, match="failed source verification"):
        await pipeline.generate(
            client=FakeProvider(response), sources=[], notebook_id=None, source_brief="Источник",
            course_title="Первый оффер", module=blueprint.modules[0],
            lesson=blueprint.modules[0].lessons[0],
            product_strategy=ProductCourseStrategyPayload.model_validate(_strategy()),
        )
