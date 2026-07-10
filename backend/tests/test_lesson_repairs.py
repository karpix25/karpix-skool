from app.schemas.lesson_generation import GeneratedLessonPayload
from app.services.lesson_generation.lesson_repairs import ensure_course_path_bridge


def test_ensure_course_path_bridge_appends_escaped_blueprint_bridge():
    lesson = GeneratedLessonPayload(
        title="Создание скила для парсинга YouTube",
        html="<h2>Готовый скил</h2><p>Ученик сохраняет рабочую конфигурацию и инструкцию.</p>",
    )

    repaired, changed = ensure_course_path_bridge(
        lesson,
        bridge="Применить скил в проекте <Claude Code>.",
    )

    assert changed is True
    assert "На следующем шаге" in repaired.html
    assert "&lt;Claude Code&gt;" in repaired.html


def test_ensure_course_path_bridge_keeps_existing_bridge():
    lesson = GeneratedLessonPayload(
        title="Создание скила",
        html=(
            "<p>Ученик сохраняет рабочую инструкцию. "
            "На следующем шаге этот артефакт станет основой проекта.</p>"
        ),
    )

    repaired, changed = ensure_course_path_bridge(
        lesson,
        bridge="Применить скил в проекте.",
    )

    assert changed is False
    assert repaired is lesson
