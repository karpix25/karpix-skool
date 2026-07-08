import re
from html.parser import HTMLParser

from ...models_generation import CourseStructureGenerationJob
from ...schemas.lesson_generation import GeneratedCourseStructurePayload
from ...schemas.lesson_generation import GeneratedLessonPayload
from .parser import LessonGenerationParseError


MIN_LESSON_TEXT_CHARS = 900
MIN_LESSON_PARAGRAPHS = 6
MIN_LESSON_SECTIONS = 4
MIN_LESSON_LIST_ITEMS = 3

GENERIC_SECTION_TITLES = {
    "проблема",
    "проблема запуска бизнеса",
    "проблема продаж",
    "что вы узнаете",
    "пример успешного кейса",
    "задание",
    "итог",
    "шаблоны предложений",
    "пять шагов запуска",
}


class _LessonHtmlParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.text_parts: list[str] = []
        self.section_titles: list[str] = []
        self.paragraph_count = 0
        self.list_item_count = 0
        self._capture_heading = False
        self._heading_parts: list[str] = []

    def handle_starttag(self, tag: str, _attrs):
        normalized = tag.lower()
        if normalized in {"h2", "h3"}:
            self._capture_heading = True
            self._heading_parts = []
        elif normalized == "p":
            self.paragraph_count += 1
        elif normalized == "li":
            self.list_item_count += 1

    def handle_endtag(self, tag: str):
        if tag.lower() in {"h2", "h3"} and self._capture_heading:
            heading = _normalize_text(" ".join(self._heading_parts))
            if heading:
                self.section_titles.append(heading)
            self._capture_heading = False
            self._heading_parts = []

    def handle_data(self, data: str):
        if not data.strip():
            return
        self.text_parts.append(data)
        if self._capture_heading:
            self._heading_parts.append(data)

    @property
    def text(self) -> str:
        return _normalize_text(" ".join(self.text_parts))


def validate_generated_course_structure(
    *,
    generated: GeneratedCourseStructurePayload,
    job: CourseStructureGenerationJob,
) -> None:
    _validate_requested_counts(generated=generated, job=job)

    titles_seen: set[str] = set()
    generic_heading_hits = 0
    lesson_count = 0

    for module in generated.modules:
        module_title = _normalize_text(module.title)
        if module_title in titles_seen:
            raise LessonGenerationParseError(f"Duplicate module title: {module.title}")
        titles_seen.add(module_title)

        for lesson in module.lessons:
            lesson_count += 1
            lesson_title = _normalize_text(lesson.title)
            if lesson_title in titles_seen:
                raise LessonGenerationParseError(f"Duplicate lesson title: {lesson.title}")
            titles_seen.add(lesson_title)
            generic_heading_hits += _validate_lesson_quality(lesson.title, lesson.html)

    if lesson_count:
        generic_ratio = generic_heading_hits / lesson_count
        if generic_ratio >= 3:
            raise LessonGenerationParseError(
                "Generated lessons use the same generic template headings instead of course-specific packaging"
            )


def validate_generated_lesson_quality(lesson: GeneratedLessonPayload) -> None:
    _validate_lesson_quality(lesson.title, lesson.html)


def _validate_requested_counts(
    *,
    generated: GeneratedCourseStructurePayload,
    job: CourseStructureGenerationJob,
) -> None:
    module_count = len(generated.modules)
    if module_count != job.module_count:
        raise LessonGenerationParseError(
            f"Expected exactly {job.module_count} modules, got {module_count}"
        )

    for index, module in enumerate(generated.modules, start=1):
        lesson_count = len(module.lessons)
        if lesson_count != job.lessons_per_module:
            raise LessonGenerationParseError(
                f"Expected exactly {job.lessons_per_module} lessons in module {index}, got {lesson_count}"
            )


def _validate_lesson_quality(title: str, html: str) -> int:
    parsed = _parse_html(html)
    text = parsed.text
    text_len = len(text)
    section_count = len(parsed.section_titles)

    if text_len < MIN_LESSON_TEXT_CHARS:
        raise LessonGenerationParseError(
            f'Lesson "{title}" is too shallow: {text_len} text characters, '
            f"minimum is {MIN_LESSON_TEXT_CHARS}"
        )
    if parsed.paragraph_count < MIN_LESSON_PARAGRAPHS:
        raise LessonGenerationParseError(
            f'Lesson "{title}" needs at least {MIN_LESSON_PARAGRAPHS} paragraphs'
        )
    if section_count < MIN_LESSON_SECTIONS:
        raise LessonGenerationParseError(
            f'Lesson "{title}" needs at least {MIN_LESSON_SECTIONS} course-specific sections'
        )
    if parsed.list_item_count < MIN_LESSON_LIST_ITEMS:
        raise LessonGenerationParseError(
            f'Lesson "{title}" needs at least {MIN_LESSON_LIST_ITEMS} checklist or exercise items'
        )

    generic_heading_count = sum(
        1 for heading in parsed.section_titles if heading in GENERIC_SECTION_TITLES
    )
    if generic_heading_count >= 4:
        raise LessonGenerationParseError(
            f'Lesson "{title}" looks like a repeated generic template, not a packaged course lesson'
        )
    if _has_repetitive_short_sentences(text):
        raise LessonGenerationParseError(
            f'Lesson "{title}" is too repetitive and summary-like'
        )
    return generic_heading_count


def _parse_html(html: str) -> _LessonHtmlParser:
    parser = _LessonHtmlParser()
    parser.feed(html)
    parser.close()
    return parser


def _has_repetitive_short_sentences(text: str) -> bool:
    sentences = [sentence.strip() for sentence in re.split(r"[.!?]+", text) if sentence.strip()]
    if len(sentences) < 6:
        return False
    short_sentences = [sentence for sentence in sentences if len(sentence) < 90]
    return len(short_sentences) / len(sentences) > 0.8


def _normalize_text(value: str) -> str:
    return " ".join(value.casefold().split())
