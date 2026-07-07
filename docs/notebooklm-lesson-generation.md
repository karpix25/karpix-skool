# NotebookLM Lesson Generation

This feature creates draft course content from a NotebookLM notebook link. The
primary flow creates module folders and draft lessons inside an existing course.
The older module-level flow can still create draft lessons inside one module.

## Admin Flow

1. Click `Добавить курс` and choose `NotebookLM`, or open an existing course and click `Из NotebookLM`.
2. Paste a NotebookLM link and choose module count, lessons per module, audience level, and style.
3. The system creates normal unpublished modules and lessons in that course.
4. Admin reviews, edits, adds screenshots manually in the lesson editor, then publishes.

## Runtime Shape

- FastAPI stores a queued `CourseStructureGenerationJob` for course-wide generation.
- The module-level flow still stores a queued `LessonGenerationJob`.
- `lesson_generation_worker` polls queued jobs.
- The worker calls `notebooklm-mcp` over internal HTTP MCP.
- NotebookLM returns structured JSON module and lesson drafts.
- The backend sanitizes HTML and saves ordinary `Module` and `Lesson` rows.
- Lessons are saved with `is_published=false`.
- `GeneratedCourseModuleDraft` keeps the audit link between the job and created modules.
- `GeneratedLessonDraft` keeps the audit link for module-level generation jobs.

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
`setup_auth` tool. On production VPS hosts, the sidecar starts Xvfb, x11vnc, and
noVNC internally. The noVNC port is not published directly; the backend exposes a
short-lived token-gated proxy at:

```text
${NOTEBOOKLM_AUTH_PUBLIC_BASE_URL}/notebooklm/auth/{token}/browser/vnc.html
```

Super admins receive the normal Telegram auth link first. That page starts the
server-side browser and shows an "Открыть серверный браузер" button. The Google
login must happen in that server browser so cookies are saved into the persistent
`notebooklm_data` volume.

Important env vars:

- `NOTEBOOKLM_MCP_URL=http://notebooklm:3000/mcp`
- `NOTEBOOKLM_REMOTE_BROWSER_URL=http://notebooklm:6080`
- `NOTEBOOKLM_AUTH_PUBLIC_BASE_URL=https://your-api.example.com`
- `NOTEBOOKLM_AUTH_SESSION_TTL_MINUTES=10`
- `NOTEBOOKLM_AUTH_SETUP_TIMEOUT_SECONDS=10`
- `NOTEBOOKLM_ANSWER_TIMEOUT_SECONDS=900`
- `NOTEBOOKLM_ANSWER_TIMEOUT_MS=900000`
- `NOTEBOOKLM_PROFILE=standard`
- `NOTEBOOKLM_BROWSER_CHANNEL=chromium`
- `NOTEBOOKLM_HEADLESS=false`
- `NOTEBOOKLM_NOVNC_PORT=6080`
- `NOTEBOOKLM_VNC_PORT=5900`
- `NOTEBOOKLM_XVFB_SCREEN=1440x900x24`
- `LESSON_GENERATION_POLL_SECONDS=5`

## Course Quality Rules

NotebookLM is treated as a draft generator, not an autopublisher. The course
prompt asks for Russian module folders, structured lessons, practical examples,
checklist/task blocks, and explicit screenshot placeholders when visual proof is
needed. The admin remains the approval gate before lessons become visible to
students.
