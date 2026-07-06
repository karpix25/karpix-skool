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


def test_sanitize_lesson_content_keeps_safe_media_data_attrs():
    html = """
    <div data-media-width="100%" data-media-align="center" data-caption="Intro frame"></div>
    <img src="https://cdn.example.com/photo.webp" data-media-width="320px" data-media-align="left" data-caption="Photo">
    <iframe src="https://www.youtube.com/embed/abcdefghijk" data-media-width="75%" data-media-align="wide" data-caption="Video"></iframe>
    """

    sanitized = sanitize_lesson_content(html)

    assert 'data-media-width="100%"' in sanitized
    assert 'data-media-align="center"' in sanitized
    assert 'data-caption="Intro frame"' in sanitized
    assert 'data-media-width="320px"' in sanitized
    assert 'data-media-align="left"' in sanitized
    assert 'data-media-width="75%"' in sanitized
    assert 'data-media-align="wide"' in sanitized
    assert 'data-caption="Video"' in sanitized


def test_sanitize_lesson_content_keeps_mux_placeholder_with_empty_playback_id():
    html = """
    <div
        data-mux-playback-id=""
        data-lesson-id="lesson123"
        data-media-width="100%"
        data-media-align="center"
    ></div>
    """

    sanitized = sanitize_lesson_content(html)

    assert 'data-mux-playback-id=""' in sanitized
    assert 'data-lesson-id="lesson123"' in sanitized
    assert 'data-media-width="100%"' in sanitized
    assert 'data-media-align="center"' in sanitized


def test_sanitize_lesson_content_rejects_unsafe_media_attrs_and_inline_css():
    html = """
    <img
        src="javascript:alert(1)"
        style="width:9999px"
        onerror="alert(1)"
        data-media-width="999%"
        data-media-align="expression(alert(1))"
        data-caption="bad\u0001caption"
        data-extra="nope"
    >
    <div style="color:red" data-media-width="640" data-media-align="right" onclick="bad()"></div>
    """

    sanitized = sanitize_lesson_content(html)

    assert "javascript:" not in sanitized.lower()
    assert "style=" not in sanitized
    assert "onerror" not in sanitized
    assert "onclick" not in sanitized
    assert "data-extra" not in sanitized
    assert "999%" not in sanitized
    assert "expression" not in sanitized
    assert "bad" not in sanitized
    assert 'data-media-width="640"' in sanitized
    assert 'data-media-align="right"' in sanitized
