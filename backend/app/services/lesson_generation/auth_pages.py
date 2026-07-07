import html

from .auth_sessions import NotebookLMAuthLaunchResult


def render_notebooklm_auth_page(result: NotebookLMAuthLaunchResult) -> str:
    title = "NotebookLM авторизован" if result.authenticated else "Авторизация NotebookLM"
    escaped_message = html.escape(result.message)
    browser_link = _render_remote_browser_link(result)
    return f"""
<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{html.escape(title)}</title>
  <style>
    body {{ font-family: system-ui, sans-serif; margin: 0; padding: 32px; line-height: 1.5; }}
    main {{ max-width: 680px; margin: 0 auto; }}
    h1 {{ font-size: 24px; margin-bottom: 12px; }}
    p {{ color: #334155; }}
    .note {{ padding: 16px; border: 1px solid #cbd5e1; border-radius: 8px; background: #f8fafc; }}
    .button {{ display: inline-block; margin-top: 16px; padding: 12px 16px; border-radius: 8px; background: #2563eb; color: white; text-decoration: none; font-weight: 700; }}
  </style>
</head>
<body>
  <main>
    <h1>{html.escape(title)}</h1>
    <div class="note"><p>{escaped_message}</p>{browser_link}</div>
    <p>Логин сохраняется в серверном Chrome-профиле NotebookLM, не на этом устройстве.</p>
  </main>
</body>
</html>
""".strip()


def render_notebooklm_auth_error_page(message: str) -> str:
    return f"""
<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Ссылка NotebookLM недоступна</title>
  <style>
    body {{ font-family: system-ui, sans-serif; margin: 0; padding: 32px; line-height: 1.5; }}
    main {{ max-width: 640px; margin: 0 auto; }}
    h1 {{ font-size: 24px; margin-bottom: 12px; }}
    p {{ color: #334155; }}
    .note {{ padding: 16px; border: 1px solid #fecaca; border-radius: 8px; background: #fef2f2; }}
  </style>
</head>
<body>
  <main>
    <h1>Ссылка NotebookLM недоступна</h1>
    <div class="note"><p>{html.escape(message)}</p></div>
  </main>
</body>
</html>
""".strip()


def _render_remote_browser_link(result: NotebookLMAuthLaunchResult) -> str:
    if result.authenticated or not result.remote_browser_url:
        return ""

    url = html.escape(result.remote_browser_url, quote=True)
    return (
        f'<p><a class="button" href="{url}" target="_blank" rel="noopener">'
        "Открыть серверный браузер</a></p>"
        "<p>Войдите в Google в открывшемся браузере, затем вернитесь сюда и обновите страницу.</p>"
    )
