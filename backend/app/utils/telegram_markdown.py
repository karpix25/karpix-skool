MARKDOWN_SPECIAL_CHARS = frozenset("_*[]()`\\")
MARKDOWN_V2_SPECIAL_CHARS = frozenset("_*[]()~`>#+-=|{}.!\\")


def escape_markdown(value: object) -> str:
    return _escape(value, MARKDOWN_SPECIAL_CHARS)


def escape_markdown_v2(value: object) -> str:
    return _escape(value, MARKDOWN_V2_SPECIAL_CHARS)


def markdown_v2_bold(value: object) -> str:
    return f"*{escape_markdown_v2(value)}*"


def _escape(value: object, special_chars: frozenset[str]) -> str:
    return "".join(f"\\{char}" if char in special_chars else char for char in str(value))
