---
name: karpix-skool
description: Project context for Karpix Skool. Use for any task in this repo so the agent starts from the real product model, architecture, course-generation contract, validation commands, and common production debugging seams.
allowed-tools: Read, Write, Edit, Glob, Grep, Bash, Agent
version: 1.0
priority: HIGH
---

# Karpix Skool Project Context

Use this skill whenever the workspace is `/Users/nadaraya/Desktop/karpix-skool` or the user asks about Karpix Skool.

The goal is to stop re-discovering the project from zero. Still verify current code, logs, and production state before making claims about live behavior.

## Product Model

Karpix Skool is a Telegram-first, multi-tenant learning SaaS for course/community owners.

Core surfaces:

- Student Telegram Mini App: courses, lessons, progress, levels, leaderboard, community access, VIP/free access states.
- Admin webapp: courses, modules, lessons, editor, sources, course generation, students, team, settings, super-admin.
- Telegram bot: group setup, learning flows, lesson/course entry buttons, group membership and notifications.
- Backend: FastAPI, SQLModel/Postgres, Redis, R2 uploads, Mux, payments, tenant access, generation workers.
- Open Notebook integration: upstream source ingestion and draft generation, not the system of record.

Product contract:

- Preserve the existing `Course -> Module -> Lesson` hierarchy unless the user explicitly asks for a redesign.
- Karpix owns authoring, review, publication, access control, and student rendering.
- Notebook/source tools are upstream draft sources. They do not autopublish.
- Admin approval is mandatory before generated modules or lessons are visible to students.
- Screenshots/assets belong inside lesson content or lesson attachments, not in a separate research-summary product layer.
- Prefer practical AI copilot/audit/draft support over broad autonomous publishing.
- Avoid gamification for its own sake. Improvements should support learning, practice, and community value.

## Important Paths

Backend:

- `backend/app/main.py` wires FastAPI routes.
- `backend/app/models.py`, `backend/app/models_generation.py`, `backend/app/models_course_generation_pipeline.py` define persistence.
- `backend/app/routes/*` own API boundaries.
- `backend/app/services/webapp/*` owns student-facing access/progress logic.
- `backend/app/services/lesson_generation/*` owns source ingestion, structure generation, parsing, quality, publishing, and recovery.
- `backend/app/services/course_generation_pipeline/*` owns the newer pipeline stages and publish gate.
- `backend/app/workers/lesson_generation_worker.py` runs queued generation work.
- `backend/bot/*` owns Telegram bot handlers, setup, and Mini App buttons.
- `backend/alembic/versions/*` owns migrations.

Frontend:

- `frontend-webapp/src/pages/student/*` owns student pages.
- `frontend-webapp/src/pages/student/course-workspace/*` owns the desktop/mobile course workspace.
- `frontend-webapp/src/pages/student/components/*` owns reusable student course/lesson UI.
- `frontend-webapp/src/pages/admin/*` owns admin pages.
- `frontend-webapp/src/pages/admin/course-editor/*` owns existing course/module/lesson editor flow.
- `frontend-webapp/src/pages/admin/course-sources/*` owns source composer/reference UI.
- `frontend-webapp/src/pages/admin/course-generation/*` and `course-generation-pipeline/*` own generation UI.
- `frontend-webapp/src/pages/admin/agent-runs/*` owns admin AI assistant / agent run workflow.
- `frontend-webapp/src/services/*`, `src/api/client.ts`, and `src/types/*` own API access and shared contracts.
- `frontend-webapp/src/index.css` owns global lesson prose styling and Telegram WebView readability fixes.

Docs:

- `README.md` has local stack setup.
- `docs/open-notebook-lesson-generation.md` explains the draft-first Open Notebook flow.
- `docs/RELEASE_CHECKLIST.md` has release env and CI expectations.
- `docs/PLAN-*.md` are historical/product plans; inspect before duplicating feature ideas.

## Course Generation Truth

Do not judge generation by UI status alone.

When generation looks wrong, inspect:

- Worker logs from `lesson_generation_worker`.
- Open Notebook API/health and model configuration.
- Parser errors in `backend/app/services/lesson_generation/parser.py` and tolerant JSON handling.
- Source ingestion code, especially `social_video_sources.py` and `scrape_creators_client.py` for video/transcript failures.
- Postgres rows in `course`, `module`, `lesson`, `coursestructuregenerationjob`, and `lessongenerationjob`.
- Counts such as requested modules/lessons vs `created_module_count` and `created_lesson_count`.
- Whether drafts are unpublished: `course_structure_publisher.py` creates lessons with `is_published=False`.

Important failure patterns:

- `drafts_created` means drafts were created; it does not prove the course is complete, packaged well, or published.
- `Open Notebook response did not contain a JSON object` means transport/auth may be fine; inspect raw output and parser behavior.
- Literal newlines/control characters inside Notebook JSON strings can require `json.loads(..., strict=False)` fallback.
- `ScrapeCreators API HTTP 500: HARD_TIMEOUT` is upstream source ingestion before Open Notebook/course-writing logic.
- If the user says the course text is poor or templated, evaluate actual lesson packaging and readability, not only job state.

## Telegram And WebView Truth

For Telegram Mini App bugs, check the actual button type and start parameter before changing routing or SSL.

- Lesson/course entry from Telegram mobile should use `InlineKeyboardButton(..., web_app=WebAppInfo(url=...))` where needed.
- Lesson deep links use `?startapp=lesson_<id>` style parameters from `settings.WEBAPP_URL` or `settings.FRONTEND_URL`.
- Shared route/deep-link seams include `backend/app/services/deep_links.py`, `backend/app/routes/webapp_deep_links.py`, `frontend-webapp/src/services/telegramStartParam.ts`, and `frontend-webapp/src/components/DeepLinkNavigator.tsx`.
- Telegram desktop and phone behavior can differ; mobile-only failures often come from `url` vs `web_app` buttons.

For lesson rendering:

- Student lesson HTML goes through `LessonHtmlContent.tsx`, `LessonContentSurface.tsx`, sanitizer code, and `frontend-webapp/src/index.css`.
- Keep the lesson prose theme readable in Telegram WebView. Be careful with inherited dark/prose inversion.
- Copy prevention is CSS friction only; code blocks should remain selectable when ordinary lesson prose is non-selectable.

## Access And Files

- Admin lesson attachment routes live under `/courses/lessons/{lesson_id}/attachments`.
- Student protected download route is `/webapp/lessons/{lesson_id}/attachments/{attachment_id}/download`.
- Student downloads must remain backend-mediated and must check lesson access before storage reads.
- VIP/free access behavior belongs in tenant access and student course card seams; if a VIP access link exists, locked course cards can act as entry points.
- R2/Mux/public file changes must preserve access rules and content-disposition behavior.

## Development Commands

Local stack:

```bash
cp backend/.env.example .env
docker-compose up --build
```

Backend tests:

```bash
python3 -m pytest backend/tests/test_name.py
python3 -m pytest backend/tests
```

Frontend commands:

```bash
cd frontend-webapp
npm run test
npm run lint
npm run build
```

Prefer targeted tests first, then broaden based on blast radius. On this machine, use `python3 -m pytest`; plain `python -m pytest` may fail.

## Implementation Rules

- Follow the repository's modular shape. Do not put UI, API calls, validation, types, and business logic into one oversized file.
- Keep files focused and under 500 lines. Prefer extracting new substantial logic into focused modules before expanding large files.
- Before adding course-generation behavior, inspect existing source/generation/publish paths to avoid duplicate architecture.
- Before changing shared student course navigation, check `CourseCurriculumNav`, desktop sidebar modules, mobile outline, and tests because the nav is reused.
- Before changing bot/Mini App flow, check backend tests around `handlers_start`, deep links, and rendered Telegram button shape.
- Before changing generated content quality, inspect prompt modules and quality tests rather than only UI forms.
- When the user explicitly asks for audit/analysis only, stay read-only.
- When the user says to push/deploy, implementation is not done until the requested git/deploy action and verification are complete.

## Production Verification Heuristics

Use live truth for production/runtime questions:

- Backend health: public `/health` endpoint and container health.
- Webapp truth: built bundle/chunk content, not only local source.
- Course generation truth: worker logs plus DB job rows plus actual lesson rows/content.
- Deploy truth: running container/image or Coolify queue completion, not just a pushed commit.
- If Coolify source context is stale or not a git checkout, sync from a clean `git archive HEAD` snapshot rather than patching random files.

Do not expose secrets in commits or chat. Keep `.env` files and ngrok credentials out of git.
