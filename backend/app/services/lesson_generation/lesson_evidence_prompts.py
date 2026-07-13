import json

from .course_structure_stage_payloads import (
    CourseBlueprintLessonPayload,
    CourseBlueprintModulePayload,
    ProductCourseStrategyPayload,
)


def build_lesson_evidence_prompt(
    *,
    course_title: str,
    module: CourseBlueprintModulePayload,
    lesson: CourseBlueprintLessonPayload,
    source_brief: str,
    product_strategy: ProductCourseStrategyPayload,
) -> str:
    return f"""
Помоги собрать материал для одного урока курса "{course_title}".

Пиши обычным понятным текстом, как ассистент-исследователь для методиста.
Не пиши JSON, код, markdown-схемы данных или технические поля.
Не пиши сам урок. Нужны только факты из источников, которые помогут написать урок.
Используй только материалы из этого Notebook. Если информации не хватает, прямо скажи, чего не хватает.

Коротко о курсе:
- Название курса: {course_title}
- Обещание курса: {product_strategy.product_promise}
- Для кого курс: {product_strategy.target_student}
- Итоговый проект: {product_strategy.final_project}

Общий конспект источников:
{source_brief}

Модуль:
- Название: {module.title}
- Результат модуля: {module.module_outcome}
- Часть итогового проекта: {module.final_project_piece}

Урок:
- Название: {lesson.title}
- Что ученик должен понять или сделать: {lesson.learning_outcome}
- Практический результат ученика: {lesson.student_deliverable}
- Что искать в источниках: {lesson.source_focus}
- Связь с соседними уроками: {lesson.course_path_bridge}

Ответь обычным текстом по разделам:

1. Ключевые факты для урока.
2. Шаги или процесс, если они есть в источниках.
3. Примеры, кейсы, формулировки или сценарии из источников.
4. Ограничения: что нельзя обещать или утверждать без опоры на источник.
5. Чего не хватает в источниках для сильного урока.
""".strip()


def build_lesson_evidence_structuring_prompt(
    *,
    course_title: str,
    module: CourseBlueprintModulePayload,
    lesson: CourseBlueprintLessonPayload,
    notebook_answer: str,
    source_contexts: list[dict],
) -> str:
    contexts_json = json.dumps(_compact_contexts(source_contexts), ensure_ascii=False, indent=2)
    return f"""
Convert a human NotebookLM research answer into a strict internal evidence pack.

Return valid JSON only. Do not use markdown fences.
Use the source contexts below as the source of truth for quotes, source_id, and source_title.
Every quote must be copied exactly from a source context. Never invent quotes.
If the NotebookLM answer is too vague, use the source contexts to preserve only evidence relevant to the lesson.

Course: {course_title}
Module: {module.title}
Lesson: {lesson.title}
Lesson outcome: {lesson.learning_outcome}
Student deliverable: {lesson.student_deliverable}
Source focus: {lesson.source_focus}

NotebookLM human answer:
{notebook_answer}

Source contexts:
{contexts_json}

JSON shape:
{{
  "evidence_pack": {{
    "evidence": [
      {{
        "kind": "fact",
        "claim": "source-grounded claim",
        "quote": "exact short source quote",
        "source_id": "source:123",
        "source_title": "source title",
        "location_hint": "section or timestamp, or null",
        "lesson_use": "how this evidence supports the lesson"
      }}
    ],
    "source_gaps": [],
    "sufficiency": "sufficient",
    "source_basis_summary": "why these sources support the lesson"
  }}
}}
""".strip()


def _compact_contexts(source_contexts: list[dict]) -> list[dict]:
    compacted = []
    for context in source_contexts:
        text = str(context.get("full_text") or context.get("text") or context.get("content") or "")
        compacted.append(
            {
                "source_id": context.get("source_id"),
                "source_title": context.get("title") or context.get("source_title"),
                "full_text": text[:12000],
            }
        )
    return compacted
