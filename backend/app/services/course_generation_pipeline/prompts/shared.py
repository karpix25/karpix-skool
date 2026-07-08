FACT_BOUNDARY = (
    "Use only facts present in the Open Notebook source context supplied with this task. "
    "Do not use outside knowledge, assumptions, or invented examples."
)

JSON_ONLY = "Return valid JSON only. Do not wrap it in markdown fences or explanatory text."


def optional_lines(**values: str | None) -> str:
    lines = [f"{label}: {value.strip()}" for label, value in values.items() if value and value.strip()]
    return "\n".join(lines)


def numbered_lines(values: list[str]) -> str:
    return "\n".join(f"{index + 1}. {value.strip()}" for index, value in enumerate(values) if value.strip())
