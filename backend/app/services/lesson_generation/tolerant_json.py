import ast
import json
import re
from typing import Any, Iterable


FENCE_PATTERN = re.compile(r"^\s*```(?:json|javascript|js)?\s*|\s*```\s*$", re.IGNORECASE)
TRAILING_COMMA_PATTERN = re.compile(r",\s*([}\]])")
SMART_QUOTES = str.maketrans({
    "\u201c": '"',
    "\u201d": '"',
    "\u2018": "'",
    "\u2019": "'",
})


class TolerantJsonError(ValueError):
    pass


def load_tolerant_json(raw_value: str) -> Any:
    last_error: Exception | None = None
    for candidate in _candidate_strings(_strip_fences(raw_value)):
        for variant in _candidate_variants(candidate):
            try:
                return _decode_json_prefix(variant)
            except (json.JSONDecodeError, ValueError, SyntaxError) as exc:
                last_error = exc

            try:
                return ast.literal_eval(variant)
            except (ValueError, SyntaxError) as exc:
                last_error = exc

    message = str(last_error) if last_error else "No JSON candidate found"
    raise TolerantJsonError(message)


def _strip_fences(raw_value: str) -> str:
    value = raw_value.strip().lstrip("\ufeff")
    return FENCE_PATTERN.sub("", value).strip()


def _candidate_strings(value: str) -> Iterable[str]:
    clean_value = value.strip()
    if clean_value:
        yield clean_value

    for index, character in enumerate(clean_value):
        if character in "{[":
            yield clean_value[index:].strip()


def _candidate_variants(candidate: str) -> Iterable[str]:
    clean_candidate = candidate.strip()
    variants = [
        clean_candidate,
        clean_candidate.translate(SMART_QUOTES),
        TRAILING_COMMA_PATTERN.sub(r"\1", clean_candidate),
        TRAILING_COMMA_PATTERN.sub(r"\1", clean_candidate.translate(SMART_QUOTES)),
    ]
    seen: set[str] = set()
    for variant in variants:
        if variant and variant not in seen:
            seen.add(variant)
            yield variant


def _decode_json_prefix(value: str) -> Any:
    decoder = json.JSONDecoder(strict=False)
    loaded, _end = decoder.raw_decode(value.lstrip())
    return loaded
