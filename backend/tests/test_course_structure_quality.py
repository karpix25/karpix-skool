import json
import uuid

import pytest

from app.models_generation import CourseStructureGenerationJob
from app.schemas.lesson_generation import (
    GeneratedCourseModulePayload,
    GeneratedCourseStructurePayload,
    GeneratedLessonPayload,
)
from app.services.lesson_generation.course_structure_generator import CourseStructureGenerator
from app.services.lesson_generation.course_structure_quality import validate_generated_course_structure
from app.services.lesson_generation.parser import LessonGenerationParseError


def _job(*, module_count: int = 2, lessons_per_module: int = 2) -> CourseStructureGenerationJob:
    return CourseStructureGenerationJob(
        tenant_id=uuid.uuid4(),
        course_id=uuid.uuid4(),
        created_by_user_id=uuid.uuid4(),
        notebook_url="notebook:course",
        module_count=module_count,
        lessons_per_module=lessons_per_module,
    )


def _rich_lesson_html(topic: str) -> str:
    detail = (
        f"{topic}: ученик берет материал из источника, превращает его в рабочий шаг, "
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
<p><strong>Визуал:</strong> добавьте схему, где сегмент клиента переходит в боль, оффер, проверочный вопрос и следующий шаг курса.</p>
<ul>
  <li>запишите один сегмент клиента и его конкретную операционную проблему.</li>
  <li>соберите мини-оффер из результата, процесса и ограничения по сроку.</li>
  <li>сформулируйте проверочный вопрос, который подтвердит спрос до сборки продукта.</li>
</ul>
<h2>Черновик артефакта ученика</h2>
<p>{detail * 2}</p>
<p>В конце урока ученик сохраняет готовый черновик: название оффера, кому он нужен, какой первый шаг он выполнит и как поймет, что идея прошла проверку. На следующем шаге этот артефакт станет входом для первого контакта с клиентом.</p>
""".strip()


def _structure(*, module_count: int = 2, lessons_per_module: int = 2) -> GeneratedCourseStructurePayload:
    return GeneratedCourseStructurePayload(
        modules=[
            GeneratedCourseModulePayload(
                title=f"Модуль {module_index + 1}",
                lessons=[
                    GeneratedLessonPayload(
                        title=f"Урок {module_index + 1}.{lesson_index + 1}",
                        html=_rich_lesson_html(f"тема {module_index + 1}.{lesson_index + 1}"),
                        media_plan=["Схема: сегмент клиента -> боль -> оффер -> проверочный вопрос"],
                    )
                    for lesson_index in range(lessons_per_module)
                ],
            )
            for module_index in range(module_count)
        ]
    )


def test_validate_generated_course_structure_accepts_packaged_lessons():
    validate_generated_course_structure(generated=_structure(), job=_job())


def test_validate_generated_course_structure_allows_auto_sized_structure_under_limits():
    generated = _structure(module_count=1, lessons_per_module=2)

    validate_generated_course_structure(generated=generated, job=_job(module_count=2, lessons_per_module=2))


def test_validate_generated_course_structure_rejects_short_template_cards():
    generated = GeneratedCourseStructurePayload(
        modules=[
            GeneratedCourseModulePayload(
                title="Стратегия запуска ИИ-бизнеса с нуля",
                lessons=[
                    GeneratedLessonPayload(
                        title="План запуска ИИ-услуг за 5 шагов",
                        html=(
                            "<h2>Проблема запуска бизнеса</h2><p>Запуск ИИ-услуг может показаться сложным.</p>"
                            "<h2>Что вы узнаете</h2><p>Вы изучите методологию запуска бизнеса.</p>"
                            "<h2>Пять шагов запуска</h2><p>Валидация, предпродажа, ручной запуск.</p>"
                            "<h2>Задание</h2><p>Напишите скрипт валидации идеи.</p>"
                            "<h2>Итог</h2><p>Пошаговый подход помогает протестировать спрос.</p>"
                        ),
                    )
                ],
            )
        ]
    )

    with pytest.raises(LessonGenerationParseError, match="too shallow"):
        validate_generated_course_structure(generated=generated, job=_job(module_count=1, lessons_per_module=1))


def test_validate_generated_course_structure_rejects_generic_heading_templates():
    long_text = "Этот абзац повторяет общую мысль без упаковки курса и без отдельного учебного артефакта. " * 6
    generated = GeneratedCourseStructurePayload(
        modules=[
            GeneratedCourseModulePayload(
                title="Продажи",
                lessons=[
                    GeneratedLessonPayload(
                        title="Продажи через чаты",
                        html=(
                            f"<h2>Проблема продаж</h2><p>{long_text}</p><p>{long_text}</p>"
                            f"<h2>Что вы узнаете</h2><p>{long_text}</p>"
                            f"<h2>Пример успешного кейса</h2><p>{long_text}</p>"
                            "<ul><li>Написать оффер.</li><li>Отправить сообщение.</li><li>Собрать ответ.</li></ul>"
                            f"<h2>Задание</h2><p>{long_text}</p>"
                            f"<h2>Итог</h2><p>{long_text}</p>"
                        ),
                    )
                ],
            )
        ]
    )

    with pytest.raises(LessonGenerationParseError, match="generic template"):
        validate_generated_course_structure(generated=generated, job=_job(module_count=1, lessons_per_module=1))


class _FakeTextGenerator:
    provider_name = "fake"
    resolved_model_name = "fake-model"

    def __init__(self, answers: list[str]):
        self.answers = list(answers)
        self.prompts: list[str] = []

    async def generate_text(self, prompt: str) -> str:
        self.prompts.append(prompt)
        return self.answers.pop(0)


@pytest.mark.asyncio
async def test_course_structure_generator_retries_rejected_low_quality_output():
    bad_answer = json.dumps(
        {
            "modules": [
                {
                    "title": "One",
                    "lessons": [{"title": "Short", "html": "<h2>Проблема</h2><p>Слишком коротко.</p>"}],
                }
            ]
        },
        ensure_ascii=False,
    )
    good_answer = json.dumps(
        {
            "modules": [
                {
                    "title": "Packaged module",
                    "lessons": [
                        {
                            "title": "Packaged lesson",
                            "html": _rich_lesson_html("качественная тема"),
                            "media_plan": ["Схема: сегмент клиента -> боль -> оффер -> проверочный вопрос"],
                        }
                    ],
                }
            ]
        },
        ensure_ascii=False,
    )
    text_generator = _FakeTextGenerator([bad_answer, good_answer])

    result = await CourseStructureGenerator(text_generator=text_generator, attempts=2).generate(
        source_brief="Источник описывает выбор ниши, упаковку оффера и проверку спроса.",
        job=_job(module_count=1, lessons_per_module=1),
        course_title="Деньги с ИИ",
    )

    assert result.response_json["attempts"] == 2
    assert result.generated.modules[0].lessons[0].title == "Packaged lesson"
    assert "Previous output was rejected" in text_generator.prompts[1]
    assert "too shallow" in text_generator.prompts[1]
