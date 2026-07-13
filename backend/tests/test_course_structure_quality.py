import json
import uuid

import pytest

from app.models_generation import CourseStructureGenerationJob
from app.schemas.lesson_generation import (
    GeneratedCourseModulePayload,
    GeneratedCourseStructurePayload,
    GeneratedLessonPayload,
    GeneratedLessonQuizPayload,
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


def _quiz() -> GeneratedLessonQuizPayload:
    return GeneratedLessonQuizPayload.model_validate(
        {
            "questions": [
                {
                    "text": "Какой шаг нужно сделать первым, чтобы применить урок?",
                    "question_type": "single_choice",
                    "explanation": "Сначала ученик выбирает первый рабочий шаг, затем проверяет результат.",
                    "options": [
                        {"text": "Выбрать первый рабочий шаг", "is_correct": True},
                        {"text": "Сразу масштабировать", "is_correct": False},
                        {"text": "Пропустить проверку", "is_correct": False},
                    ],
                },
                {
                    "text": "Какие элементы входят в практический артефакт?",
                    "question_type": "multiple_choice",
                    "explanation": "Артефакт состоит из конкретных частей, которые ученик сможет использовать дальше.",
                    "options": [
                        {"text": "Сегмент клиента", "is_correct": True},
                        {"text": "Проверочный вопрос", "is_correct": True},
                        {"text": "Общая мотивация", "is_correct": False},
                    ],
                },
                {
                    "text": "Как называется итоговый артефакт урока?",
                    "question_type": "short_text",
                    "explanation": "Ответ проверяет, понял ли ученик, что именно нужно сохранить в конце.",
                    "options": [{"text": "черновик артефакта", "is_correct": True}],
                },
            ]
        }
    )


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
                        quiz=_quiz(),
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


def test_validate_generated_course_structure_accepts_setup_workflow_artifact():
    detail = (
        "Ученик настраивает систему missed call text back как продаваемую услугу: "
        "фиксирует профиль клиента, автоответ, ограничение и способ показать ценность. "
    )
    generated = GeneratedCourseStructurePayload(
        modules=[
            GeneratedCourseModulePayload(
                title="Автоматизации для локального бизнеса",
                lessons=[
                    GeneratedLessonPayload(
                        title="Missed Call Text Back",
                        html=(
                            "<h2>Конфигурация автоответа для клиента</h2>"
                            f"<p>{detail * 2}</p><p>{detail}</p>"
                            "<h2>Скрипт SMS после пропущенного звонка</h2>"
                            f"<p>{detail * 2}</p><p>{detail}</p>"
                            "<h2>Шаги настройки системы</h2>"
                            f"<p>{detail * 2}</p>"
                            "<ol>"
                            "<li>Подключите профиль Google My Business клиента к системе автоматизации.</li>"
                            "<li>Активируйте автоответ на пропущенный звонок в настройках.</li>"
                            "<li>Введите SMS-скрипт, который запускает переписку с клиентом.</li>"
                            "</ol>"
                            "<p><strong>Визуал:</strong> добавьте схему пути звонка от пропущенного вызова до SMS-диалога.</p>"
                            "<h2>Артефакт для ROI-аргумента</h2>"
                            f"<p>{detail * 2}</p>"
                            "<p>На следующем шаге эта конфигурация станет входом для расчета ROI и коммерческого предложения клиенту.</p>"
                        ),
                        media_plan=["Схема: пропущенный звонок -> SMS -> диалог -> заявка"],
                        quiz=_quiz(),
                    )
                ],
            )
        ]
    )

    validate_generated_course_structure(generated=generated, job=_job(module_count=1, lessons_per_module=1))


def test_validate_generated_course_structure_accepts_case_study_bridge_to_outreach():
    detail = (
        "Ученик разбирает кейсы Sandy, Brandon и Brian, выделяет нишу, оффер, канал первого контакта "
        "и превращает наблюдения в собственный профиль клиента. "
    )
    generated = GeneratedCourseStructurePayload(
        modules=[
            GeneratedCourseModulePayload(
                title="Выбор прибыльной AI-услуги",
                lessons=[
                    GeneratedLessonPayload(
                        title="Анатомия успешных AI-услуг",
                        html=(
                            "<h2>Профиль клиента из кейсов</h2>"
                            f"<p>{detail * 2}</p><p>{detail}</p>"
                            "<h2>Оффер и доказательство ценности</h2>"
                            f"<p>{detail * 2}</p><p>{detail}</p>"
                            "<h2>Карта первого аутрича</h2>"
                            f"<p>{detail * 2}</p>"
                            "<ul>"
                            "<li>Оцените свой бэкграунд и выберите узкую нишу.</li>"
                            "<li>Соберите профиль клиента с болью, каналом и первым обещанием.</li>"
                            "<li>Сформулируйте демонстрационный шаг, который покажет ценность до продажи.</li>"
                            "</ul>"
                            "<p><strong>Визуал:</strong> добавьте таблицу сравнения кейсов Sandy, Brandon и Brian с нишей, оффером и каналом.</p>"
                            "<h2>Артефакт для первого контакта</h2>"
                            f"<p>{detail * 2}</p>"
                            "<p>Используйте этот подход для первого контакта: профиль клиента и демонстрационный шаг станут основой следующего сообщения.</p>"
                        ),
                        media_plan=["Таблица: кейс -> ниша -> оффер -> канал первого контакта"],
                        quiz=_quiz(),
                    )
                ],
            )
        ]
    )

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
                            "quiz": _quiz().model_dump(mode="json"),
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
