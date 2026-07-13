# Open Notebook Lesson Generation

This feature creates draft course content from a source link processed by
Open Notebook. Open Notebook owns ingestion, source extraction, and AI
transformation. Karpix owns course, module, lesson, draft, review, and publish
state.

## Admin Flow

1. Click `Добавить курс` and choose `Open Notebook`, or open an existing course
   and click `Из источника`.
2. Paste a source URL and choose module count, lessons per module, audience
   level, and style.
3. The backend creates a queued generation job.
4. The worker asks Open Notebook to create a temporary notebook, process the
   source, extract full source text, and run the Karpix JSON transformation.
5. Karpix parses the returned JSON and creates unpublished drafts.
6. The admin reviews and publishes drafts manually.

## Runtime Services

Docker Compose runs two internal Open Notebook services:

- `open_notebook_surrealdb` stores Open Notebook data.
- `open_notebook` exposes the Open Notebook API on internal port `5055` and UI
  on internal port `8502`.

The Karpix worker calls `OPEN_NOTEBOOK_API_URL`, usually
`http://open_notebook:5055/api`. Do not publish the Open Notebook API publicly
unless it is protected by `OPEN_NOTEBOOK_PASSWORD` and an external access layer.

## Required Configuration

- `NOTEBOOK_GENERATION_PROVIDER=open_notebook` default fallback when the DB
  setting has not been created yet. Super admins can switch the runtime mode in
  the admin UI.
- `OPEN_NOTEBOOK_API_URL=http://open_notebook:5055/api`
- `OPEN_NOTEBOOK_ENCRYPTION_KEY=...`
- `OPEN_NOTEBOOK_SURREAL_PASSWORD=...`
- `OPEN_NOTEBOOK_PASSWORD=` optional bearer password
- `API_URL=https://notebook.example.com` optional public Open Notebook UI/API
  origin for browser requests. Set this when the UI is published through a
  reverse proxy on port `8502`; the frontend appends `/api` itself.
- `OPEN_NOTEBOOK_TRANSFORMATION_MODEL_ID=` optional explicit language model id
- `OPEN_NOTEBOOK_ANSWER_TIMEOUT_SECONDS=900`
- `OPEN_NOTEBOOK_SOURCE_POLL_SECONDS=2`
- `OPEN_NOTEBOOK_SOURCE_POLL_ATTEMPTS=150`
- `OPEN_NOTEBOOK_EMBED_SOURCES=false`

For Google NotebookLM mode through `notebooklm-py`, configure:

- `NOTEBOOKLM_HOME=` path to the secured notebooklm-py profile storage
- `NOTEBOOKLM_PROFILE=` optional profile name
- `NOTEBOOKLM_AUTH_BROWSER_URL=` optional public or protected noVNC/browser URL
  embedded in the super-admin Google NotebookLM auth modal
- `NOTEBOOKLM_ASK_MIN_INTERVAL_SECONDS=8`
- `NOTEBOOKLM_SOURCE_WAIT_TIMEOUT_SECONDS=180`

Use a dedicated Google account for Google NotebookLM mode. Do not commit or log
`storage_state.json`, master tokens, or profile files.

Open Notebook must have a language model configured in its Models UI. If
`OPEN_NOTEBOOK_TRANSFORMATION_MODEL_ID` is empty, Karpix uses Open Notebook's
default transformation, large-context, or chat model, in that order.

For OpenRouter, set:

- `OPENROUTER_API_KEY=...`
- `OPENROUTER_BASE_URL=https://openrouter.ai/api/v1`

Then configure OpenRouter in Open Notebook's Models/API Keys UI and set a
default transformation model.

## Safety

Open Notebook is treated as a draft generator, not an autopublisher. Generated
modules and lessons are stored with `is_published=false` and must be reviewed in
the admin interface before students can see them.

## References

- https://github.com/lfnovo/open-notebook
- https://github.com/lfnovo/open-notebook/blob/main/README.md
