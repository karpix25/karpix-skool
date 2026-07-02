from app.services.content_sanitizer import sanitize_lesson_content


def test_sanitize_lesson_content_removes_scripts_events_and_bad_urls():
    html = """
    <script>alert(1)</script>
    <p onclick="alert(1)">Hello <strong>world</strong></p>
    <a href="javascript:alert(1)" target="_blank">bad link</a>
    <img src="data:image/svg+xml,<svg></svg>" onerror="alert(1)">
    """

    sanitized = sanitize_lesson_content(html)

    assert "script" not in sanitized
    assert "onclick" not in sanitized
    assert "javascript:" not in sanitized
    assert "data:image" not in sanitized
    assert "<strong>world</strong>" in sanitized


def test_sanitize_lesson_content_keeps_safe_iframe_and_mux_marker():
    html = """
    <iframe src="https://evil.example/embed/1"></iframe>
    <iframe src="https://www.youtube.com/embed/abcdefghijk" allowfullscreen></iframe>
    <div data-mux-playback-id="mux123" data-lesson-id="lesson123" onclick="bad()"></div>
    """

    sanitized = sanitize_lesson_content(html)

    assert "evil.example" not in sanitized
    assert "https://www.youtube.com/embed/abcdefghijk" in sanitized
    assert "allowfullscreen" in sanitized
    assert 'data-mux-playback-id="mux123"' in sanitized
    assert "onclick" not in sanitized


def test_sanitize_lesson_content_rejects_encoded_and_mixed_case_url_payloads():
    html = """
    <a href="JaVa&#x73;CrIpT:alert(1)">encoded</a>
    <img src="java
    script:alert(1)" alt="bad">
    <iframe src="https://www.youtube.com/embed/good" srcdoc="<script>alert(1)</script>"></iframe>
    """

    sanitized = sanitize_lesson_content(html)

    assert "javascript:" not in sanitized.lower()
    assert "srcdoc" not in sanitized
    assert 'href=' not in sanitized
    assert 'src="java' not in sanitized
