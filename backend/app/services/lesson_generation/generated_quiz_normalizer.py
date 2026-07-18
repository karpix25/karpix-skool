from typing import Any


CHOICE_TYPES = {"single_choice", "multiple_choice"}


def normalize_generated_lesson_quiz_payload(payload: dict[str, Any]) -> dict[str, Any]:
    normalized = dict(payload)
    quiz = normalized.get("quiz")
    if isinstance(quiz, dict):
        normalized["quiz"] = _normalize_quiz(quiz)
    return normalized


def _normalize_quiz(quiz: dict[str, Any]) -> dict[str, Any]:
    normalized = dict(quiz)
    questions = normalized.get("questions")
    if isinstance(questions, list):
        normalized["questions"] = [_normalize_question(question, index) for index, question in enumerate(questions)]
    return normalized


def _normalize_question(question: Any, index: int) -> Any:
    if not isinstance(question, dict):
        return question
    normalized = dict(question)
    question_type = _normalize_question_type(normalized.get("question_type") or normalized.get("type"))
    normalized["question_type"] = question_type
    normalized.setdefault("order_index", index)

    option_items = (
        normalized.get("options")
        or normalized.get("choices")
        or normalized.get("answers")
        or normalized.get("accepted_answers")
        or []
    )
    options = _normalize_options(option_items)
    correct_texts = _correct_texts(normalized)
    _mark_matching_options(options, correct_texts)
    normalized["options"] = _normalize_options_for_type(
        options,
        question_type=question_type,
        fallback_texts=correct_texts,
    )
    return normalized


def _normalize_question_type(value: Any) -> str:
    if isinstance(value, str):
        normalized = value.strip().casefold().replace("-", "_")
        if normalized in {"multiple_choice", "multi_choice", "checkbox"}:
            return "multiple_choice"
        if normalized in {"short_text", "text", "free_text", "short_answer"}:
            return "short_text"
    return "single_choice"


def _normalize_options(items: Any) -> list[dict[str, Any]]:
    if isinstance(items, str):
        items = [items]
    if not isinstance(items, list):
        return []

    options = []
    for index, item in enumerate(items):
        option = _normalize_option(item)
        if option is None:
            continue
        option.setdefault("order_index", index)
        options.append(option)
    return options


def _normalize_option(item: Any) -> dict[str, Any] | None:
    if isinstance(item, str):
        text = item.strip()
        return {"text": text, "is_correct": False} if text else None
    if not isinstance(item, dict):
        return None
    text = item.get("text") or item.get("label") or item.get("answer") or item.get("value")
    if not isinstance(text, str) or not text.strip():
        return None
    return {
        **item,
        "text": text.strip(),
        "is_correct": bool(item.get("is_correct") or item.get("correct")),
    }


def _correct_texts(question: dict[str, Any]) -> list[str]:
    values = []
    for key in ("correct_answer", "answer", "accepted_answer", "accepted_answers", "correct_options"):
        value = question.get(key)
        if isinstance(value, str):
            values.append(value)
        elif isinstance(value, list):
            values.extend(item for item in value if isinstance(item, str))
    return [value.strip() for value in values if value.strip()]


def _mark_matching_options(options: list[dict[str, Any]], correct_texts: list[str]) -> None:
    correct_lookup = {text.casefold() for text in correct_texts}
    if not correct_lookup:
        return
    for option in options:
        if str(option.get("text", "")).casefold() in correct_lookup:
            option["is_correct"] = True


def _normalize_options_for_type(
    options: list[dict[str, Any]],
    *,
    question_type: str,
    fallback_texts: list[str],
) -> list[dict[str, Any]]:
    if question_type == "short_text":
        if not options:
            options = [{"text": text, "is_correct": True, "order_index": index} for index, text in enumerate(fallback_texts)]
        if options and not any(option.get("is_correct") for option in options):
            options[0]["is_correct"] = True
        return options[:6]

    if question_type in CHOICE_TYPES and options and not any(option.get("is_correct") for option in options):
        options[0]["is_correct"] = True
    if question_type == "single_choice":
        seen_correct = False
        for option in options:
            if option.get("is_correct") and not seen_correct:
                seen_correct = True
            else:
                option["is_correct"] = False
    return options[:6]
