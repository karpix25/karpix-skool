import json
import uuid

import pytest

from app.models_generation import CourseStructureGenerationJob
from app.schemas.generation_sources import GenerationSourceInput, GenerationSourceKind
from app.services.lesson_generation.course_structure_pipeline import (
    LESSON_SOURCE_PACK_TRANSFORMATION,
    CourseStructurePipeline,
)
from app.services.lesson_generation.parser import LessonGenerationParseError


class FakeTextGenerator:
    provider_name = "fake"
    resolved_model_name = "fake-model"

    def __init__(self, answers: list[dict]):
        self.answers = [json.dumps(answer, ensure_ascii=False) for answer in answers]
        self.prompts: list[str] = []

    async def generate_text(self, prompt: str) -> str:
        self.prompts.append(prompt)
        return self.answers.pop(0)


class FakeOpenNotebookProvider:
    def __init__(self, source_pack_answers: list[dict]):
        self.source_pack_answers = [
            json.dumps(answer, ensure_ascii=False) for answer in source_pack_answers
        ]
        self.calls: list[dict] = []

    async def ask_lessons(self, *, source_url: str, question: str):
        raise AssertionError("staged course pipeline should call ask_from_sources")

    async def ask_from_sources(self, *, sources, question, notebook_id=None, transformation=None):
        self.calls.append(
            {
                "sources": sources,
                "question": question,
                "notebook_id": notebook_id,
                "transformation": transformation,
            }
        )
        return {
            "answer": self.source_pack_answers.pop(0),
            "provider": "open_notebook",
            "notebook_id": notebook_id,
            "source_id": "source:1",
            "source_ids": ["source:1"],
            "transformation_id": "transformation:source-pack",
            "model_id": "model:source-pack",
        }


def _job(*, module_count: int = 2, lessons_per_module: int = 2) -> CourseStructureGenerationJob:
    return CourseStructureGenerationJob(
        tenant_id=uuid.uuid4(),
        course_id=uuid.uuid4(),
        created_by_user_id=uuid.uuid4(),
        notebook_url="notebook:course",
        module_count=module_count,
        lessons_per_module=lessons_per_module,
    )


def _sources() -> list[GenerationSourceInput]:
    return [
        GenerationSourceInput(
            kind=GenerationSourceKind.open_notebook,
            url="https://notebook.karpix.com/notebooks/notebook%3Acourse",
        )
    ]


def _blueprint(*, module_count: int = 2, lessons_per_module: int = 2) -> dict:
    return {
        "transformation_goal": "Ученик выбирает нишу, упаковывает оффер и проверяет спрос.",
        "modules": [
            {
                "title": f"Модуль {module_index + 1}",
                "module_outcome": f"Ученик получает рабочий результат модуля {module_index + 1}.",
                "lessons": [
                    {
                        "title": f"Урок {module_index + 1}.{lesson_index + 1}",
                        "learning_outcome": "Собрать конкретный шаг для проверки спроса.",
                        "student_deliverable": "Черновик оффера и список проверочных вопросов.",
                        "source_focus": "ниша, оффер, проверка спроса, первые действия",
                    }
                    for lesson_index in range(lessons_per_module)
                ],
            }
            for module_index in range(module_count)
        ],
    }


def _source_pack(topic: str) -> dict:
    return {
        "source_pack": {
            "facts": [
                f"{topic}: источник описывает выбор денежной AI-ниши через боль клиента.",
                f"{topic}: оффер должен обещать конкретный операционный результат.",
            ],
            "process_steps": [
                "Выбрать один сегмент клиента.",
                "Сформулировать боль и результат.",
                "Проверить спрос через короткое сообщение.",
            ],
            "examples": [
                "Пример: локальный бизнес теряет заявки, если не отвечает на входящие обращения."
            ],
            "constraints": [
                "Не обещать доход без проверки спроса и подтверждения из источника."
            ],
            "source_gaps": [],
            "source_basis_summary": "Материал поддерживает урок фактами про нишу, оффер и проверку спроса.",
        }
    }


def _lesson_answer(title: str) -> dict:
    return {
        "title": title,
        "icon_emoji": "🎯",
        "html": _rich_lesson_html(title),
        "media_plan": ["Схема: сегмент клиента -> боль -> оффер -> проверочный вопрос"],
    }


def _rich_lesson_html(topic: str) -> str:
    detail = (
        f"{topic}: ученик берет факты из source pack, превращает их в рабочий шаг, "
        "проверяет ограничение, фиксирует решение и получает артефакт для следующего урока. "
    )
    return f"""
<h2>Карта решения для {topic}</h2>
<p>{detail * 2}</p>
<p>Сначала ученик формулирует исходную ситуацию: какой клиент, какая боль, какой результат должен быть виден после внедрения.</p>
<h2>Разбор источника и критерии выбора</h2>
<p>{detail * 2}</p>
<p>Затем он отделяет факты из источника от гипотез и отмечает, какие элементы нельзя обещать без дополнительной проверки.</p>
<h2>Рабочий сценарий применения</h2>
<p>{detail * 2}</p>
<ul>
  <li>Записать один сегмент клиента и его конкретную операционную проблему.</li>
  <li>Собрать мини-оффер из результата, процесса и ограничения по сроку.</li>
  <li>Сформулировать проверочный вопрос, который подтвердит спрос до сборки продукта.</li>
</ul>
<h2>Черновик артефакта ученика</h2>
<p>{detail * 2}</p>
<p>В конце урока ученик сохраняет готовый черновик: название оффера, кому он нужен, какой первый шаг он выполнит и как поймет, что идея прошла проверку.</p>
""".strip()


@pytest.mark.asyncio
async def test_staged_pipeline_gets_source_pack_once_per_lesson_and_preserves_audit():
    lesson_titles = ["Урок 1.1", "Урок 1.2", "Урок 2.1", "Урок 2.2"]
    text_generator = FakeTextGenerator(
        [
            _blueprint(),
            *[_lesson_answer(title) for title in lesson_titles],
        ]
    )
    client = FakeOpenNotebookProvider([_source_pack(title) for title in lesson_titles])

    result = await CourseStructurePipeline(text_generator=text_generator, attempts=1).generate(
        client=client,
        sources=_sources(),
        notebook_id="notebook:course",
        source_brief="Источник описывает выбор AI-ниши, упаковку оффера и проверку спроса.",
        job=_job(),
        course_title="Деньги с ИИ",
    )

    assert len(client.calls) == 4
    assert len(text_generator.prompts) == 5
    assert [module.title for module in result.generated.modules] == ["Модуль 1", "Модуль 2"]
    assert [lesson.title for module in result.generated.modules for lesson in module.lessons] == lesson_titles
    assert result.response_json["pipeline"] == "source_brief_blueprint_lesson_source_packs"
    assert len(result.response_json["lesson_audits"]) == 4
    assert all(call["notebook_id"] == "notebook:course" for call in client.calls)
    assert all(call["transformation"].name == LESSON_SOURCE_PACK_TRANSFORMATION.name for call in client.calls)
    assert "Do not write the lesson" in client.calls[0]["question"]
    assert "Урок 1.1" in client.calls[0]["question"]


@pytest.mark.asyncio
async def test_staged_pipeline_rejects_incomplete_blueprint_before_source_pack_calls():
    text_generator = FakeTextGenerator([_blueprint(module_count=1, lessons_per_module=2)])
    client = FakeOpenNotebookProvider([])

    with pytest.raises(LessonGenerationParseError, match="Expected exactly 2 blueprint modules"):
        await CourseStructurePipeline(text_generator=text_generator, attempts=1).generate(
            client=client,
            sources=_sources(),
            notebook_id="notebook:course",
            source_brief="Источник описывает выбор AI-ниши и проверку спроса.",
            job=_job(module_count=2, lessons_per_module=2),
            course_title="Деньги с ИИ",
        )

    assert client.calls == []


@pytest.mark.asyncio
async def test_staged_pipeline_rejects_thin_source_pack_before_lesson_generation():
    text_generator = FakeTextGenerator([_blueprint(module_count=1, lessons_per_module=1)])
    client = FakeOpenNotebookProvider(
        [
            {
                "source_pack": {
                    "facts": ["Слишком мало."],
                    "process_steps": [],
                    "examples": [],
                    "constraints": [],
                    "source_gaps": ["Нет материала для урока."],
                }
            }
        ]
    )

    with pytest.raises(LessonGenerationParseError, match="too little source evidence"):
        await CourseStructurePipeline(text_generator=text_generator, attempts=1).generate(
            client=client,
            sources=_sources(),
            notebook_id="notebook:course",
            source_brief="Источник описывает выбор AI-ниши.",
            job=_job(module_count=1, lessons_per_module=1),
            course_title="Деньги с ИИ",
        )

    assert len(client.calls) == 1
    assert len(text_generator.prompts) == 1


@pytest.mark.asyncio
async def test_staged_pipeline_retries_rejected_lesson_from_source_pack():
    bad_lesson = {
        "title": "Урок 1.1",
        "icon_emoji": "🎯",
        "html": "<h2>Проблема</h2><p>Слишком коротко.</p>",
        "media_plan": [],
    }
    text_generator = FakeTextGenerator(
        [
            _blueprint(module_count=1, lessons_per_module=1),
            bad_lesson,
            _lesson_answer("Урок 1.1"),
        ]
    )
    client = FakeOpenNotebookProvider([_source_pack("Урок 1.1")])

    result = await CourseStructurePipeline(text_generator=text_generator, attempts=2).generate(
        client=client,
        sources=_sources(),
        notebook_id="notebook:course",
        source_brief="Источник описывает выбор AI-ниши и проверку спроса.",
        job=_job(module_count=1, lessons_per_module=1),
        course_title="Деньги с ИИ",
    )

    assert result.generated.modules[0].lessons[0].title == "Урок 1.1"
    assert "Previous output was rejected" in text_generator.prompts[2]
    assert "too shallow" in text_generator.prompts[2]
