# NotebookLM Lesson Generation

This feature creates draft lessons inside an existing module from a NotebookLM
notebook link. It does not change the course/module/lesson hierarchy.

## Admin Flow

1. Open an existing course module in the admin course editor.
2. Click `Сгенерировать уроки`.
3. Paste a NotebookLM link and choose lesson count, audience level, and style.
4. The system creates normal unpublished lessons in that module.
5. Admin reviews, edits, adds screenshots manually in the lesson editor, then publishes.

## Runtime Shape

- FastAPI stores a queued `LessonGenerationJob`.
- `lesson_generation_worker` polls queued jobs.
- The worker calls `notebooklm-mcp` over internal HTTP MCP.
- NotebookLM returns structured JSON lesson drafts.
- The backend sanitizes HTML and saves ordinary `Lesson` rows with `is_published=false`.
- `GeneratedLessonDraft` keeps the audit link between the job and created lessons.

## Production Notes

`notebooklm-mcp` is unofficial and browser-driven. Keep it on the internal Docker
network only and persist its Chrome profile with the `notebooklm_data` volume.
Do not publish the `notebooklm` service with `ports`; only backend and worker
containers should call `NOTEBOOKLM_MCP_URL`.

Before production use, authenticate the Google account used by NotebookLM in the
sidecar profile. The upstream project documents `setup_auth`, persistent Chrome
profiles, and HTTP transport at:

- https://github.com/PleasePrompto/notebooklm-mcp

## Google Auth Flow

Telegram links must open a public backend route, not the sidecar. Configure
`NOTEBOOKLM_AUTH_PUBLIC_BASE_URL` to the public backend origin that Telegram users
can reach. The backend builds short-lived public auth URLs like:

```text
${NOTEBOOKLM_AUTH_PUBLIC_BASE_URL}/notebooklm/auth/{token}
```

That backend route owns user/session validation and calls the internal MCP server
at `NOTEBOOKLM_MCP_URL`. The sidecar host `http://notebooklm:3000/mcp` is a Docker
network address and must never be sent to Telegram or exposed through a reverse
proxy.

The `notebooklm_data` volume persists the Linux data directory
`/root/.local/share/notebooklm-mcp/`, including `chrome_profile/`, browser auth
state, and the local NotebookLM library. The `notebooklm_config` volume persists
`/root/.config/notebooklm-mcp/`, where profile/tool settings can be stored.
Together they let the server-side Chrome profile survive container restarts and
image rebuilds.

For first-time auth or re-auth, the backend route should call the MCP
`setup_auth` tool and allow a visible browser only for that short session. On
headless servers this normally needs an SSH-controlled display or Xvfb. Keep the
steady-state runtime headless:

```text
NOTEBOOKLM_HEADLESS=true
```

For a temporary server-side auth window, set `NOTEBOOKLM_HEADLESS=false` only in a
trusted maintenance session with display support, complete Google login, then
return it to `true` and restart the sidecar.

Important env vars:

- `NOTEBOOKLM_MCP_URL=http://notebooklm:3000/mcp`
- `NOTEBOOKLM_AUTH_PUBLIC_BASE_URL=https://your-api.example.com`
- `NOTEBOOKLM_AUTH_SESSION_TTL_MINUTES=10`
- `NOTEBOOKLM_ANSWER_TIMEOUT_SECONDS=900`
- `NOTEBOOKLM_ANSWER_TIMEOUT_MS=900000`
- `NOTEBOOKLM_PROFILE=standard`
- `NOTEBOOKLM_BROWSER_CHANNEL=chromium`
- `NOTEBOOKLM_HEADLESS=true`
- `LESSON_GENERATION_POLL_SECONDS=5`

## Course Quality Rules

NotebookLM is treated as a draft generator, not an autopublisher. The prompt asks
for structured Russian lessons, practical examples, checklist/task blocks, and
explicit screenshot placeholders when visual proof is needed. The admin remains
the approval gate before lessons become visible to students.
