from html import escape
from html.parser import HTMLParser
from typing import Iterable
from urllib.parse import urlparse


ALLOWED_TAGS = {
    "a",
    "blockquote",
    "br",
    "code",
    "div",
    "em",
    "h1",
    "h2",
    "h3",
    "h4",
    "hr",
    "iframe",
    "img",
    "li",
    "ol",
    "p",
    "pre",
    "s",
    "span",
    "strong",
    "u",
    "ul",
}
VOID_TAGS = {"br", "hr", "img"}
DROP_CONTENT_TAGS = {"script", "style", "svg", "math", "object", "embed", "link", "meta"}
SAFE_IFRAME_HOSTS = {
    "youtube.com",
    "www.youtube.com",
    "youtube-nocookie.com",
    "www.youtube-nocookie.com",
    "player.vimeo.com",
    "stream.mux.com",
}
GLOBAL_ATTRS = {"class"}
ALLOWED_ATTRS = {
    "a": {"href", "rel", "target", "title"},
    "code": {"class"},
    "div": {"class", "data-lesson-id", "data-mux-playback-id", "data-youtube-video"},
    "iframe": {
        "allow",
        "allowfullscreen",
        "class",
        "frameborder",
        "height",
        "loading",
        "referrerpolicy",
        "src",
        "title",
        "width",
    },
    "img": {"alt", "class", "height", "loading", "src", "title", "width"},
    "pre": {"class"},
    "span": {"class"},
}
URL_ATTRS = {"href", "src"}
LINK_SCHEMES = {"http", "https", "mailto", "tel"}
MEDIA_SCHEMES = {"http", "https"}


class LessonContentSanitizer(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.parts: list[str] = []
        self.skip_stack: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        tag = tag.lower()
        if self.skip_stack:
            if tag not in VOID_TAGS:
                self.skip_stack.append(tag)
            return
        if tag in DROP_CONTENT_TAGS:
            self.skip_stack.append(tag)
            return
        if tag not in ALLOWED_TAGS:
            return
        if tag == "iframe" and not self._is_safe_iframe(attrs):
            self.skip_stack.append(tag)
            return

        attr_text = self._format_attrs(tag, attrs)
        self.parts.append(f"<{tag}{attr_text}>")

    def handle_startendtag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        tag = tag.lower()
        if self.skip_stack or tag in DROP_CONTENT_TAGS or tag not in ALLOWED_TAGS:
            return
        if tag == "iframe" and not self._is_safe_iframe(attrs):
            return

        attr_text = self._format_attrs(tag, attrs)
        self.parts.append(f"<{tag}{attr_text}>")

    def handle_endtag(self, tag: str) -> None:
        tag = tag.lower()
        if self.skip_stack:
            if tag in self.skip_stack:
                while self.skip_stack:
                    skipped_tag = self.skip_stack.pop()
                    if skipped_tag == tag:
                        break
            return
        if tag in ALLOWED_TAGS and tag not in VOID_TAGS:
            self.parts.append(f"</{tag}>")

    def handle_data(self, data: str) -> None:
        if not self.skip_stack:
            self.parts.append(escape(data))

    def _format_attrs(self, tag: str, attrs: Iterable[tuple[str, str | None]]) -> str:
        allowed = ALLOWED_ATTRS.get(tag, set()) | GLOBAL_ATTRS
        formatted: list[str] = []
        has_blank_target = False
        has_rel = False

        for raw_name, raw_value in attrs:
            name = raw_name.lower()
            value = "" if raw_value is None else raw_value.strip()
            if name.startswith("on") or name not in allowed:
                continue
            if name in URL_ATTRS and not _is_safe_url(value, media=tag in {"img", "iframe"}):
                continue
            if name == "src" and tag == "iframe" and not _is_safe_iframe_src(value):
                continue
            if name == "target":
                if value not in {"_blank", "_self", "_parent", "_top"}:
                    continue
                has_blank_target = value == "_blank"
            if name == "rel":
                has_rel = True
            if name == "allowfullscreen":
                formatted.append(name)
                continue
            if len(value) > 2048:
                continue
            formatted.append(f'{name}="{escape(value, quote=True)}"')

        if tag == "a" and has_blank_target and not has_rel:
            formatted.append('rel="noopener noreferrer"')
        return "" if not formatted else " " + " ".join(formatted)

    def _is_safe_iframe(self, attrs: Iterable[tuple[str, str | None]]) -> bool:
        for name, value in attrs:
            if name.lower() == "src" and value:
                return _is_safe_iframe_src(value)
        return False


def sanitize_lesson_content(content: str | None) -> str | None:
    if content is None:
        return None

    parser = LessonContentSanitizer()
    parser.feed(content)
    parser.close()
    return "".join(parser.parts)


def _is_safe_url(value: str, *, media: bool) -> bool:
    normalized = "".join(value.split()).lower()
    if not normalized or normalized.startswith("//") or normalized.startswith("javascript:"):
        return False

    parsed = urlparse(value)
    if not parsed.scheme:
        return True

    allowed_schemes = MEDIA_SCHEMES if media else LINK_SCHEMES
    return parsed.scheme.lower() in allowed_schemes


def _is_safe_iframe_src(value: str) -> bool:
    parsed = urlparse(value.strip())
    if parsed.scheme.lower() != "https" or not parsed.netloc:
        return False
    return parsed.hostname in SAFE_IFRAME_HOSTS
