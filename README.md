# Telegram Learning SaaS Platform

A multi-tenant platform for managing courses and communities in Telegram.

## Quick Start in 3 Steps

### 1. Configure Environment
Create a Docker Compose `.env` file at the project root:
```bash
cp backend/.env.example .env
```

Fill every required value before production deploy:
- `POSTGRES_USER`, `POSTGRES_PASSWORD`, and `POSTGRES_DB` are required. Compose no longer falls back to `postgres/postgres`.
- `SECRET_KEY`, `BOT_TOKEN`, `BOT_USERNAME`, `FRONTEND_URL`, `WEBAPP_URL`, and `VITE_API_URL` are required for the release config.
- `VITE_API_URL` is the public backend API origin baked into the frontend build, for example `https://api.example.com`.
- Compose derives the in-container `DATABASE_URL` from `POSTGRES_*`; keep the direct-run `DATABASE_URL` in `.env` aligned if you run backend commands outside Compose.

For direct backend development without Compose, copy the same example to `backend/.env` and adjust `DATABASE_URL` for your local database host.

### 2. Start the Stack (Local)
Run the entire system (DB, Redis, Backend, Bot, Webapp) with Docker:
```bash
docker-compose up --build
```
- **Backend API:** `http://localhost:8000/docs`
- **Postgres:** Port `5432`
- **Redis:** Port `6379`
- **Bot:** Auto-starts polling
- **Webapp:** Served from the `webapp` container

### 3. Verify the owner launch flow
1. Open the superadmin panel and create a school with **Новая школа**.
2. Copy the one-time owner invitation command and let the owner claim the school through the shared Karpix bot.
3. In the owner onboarding, issue a group setup command and send `/setup <ONE_TIME_TOKEN>` in the Telegram group after adding the shared bot as an administrator.
4. Create and publish the first course and lesson, then open the student preview.
5. Join with a separate student account and confirm that the school reaches the `Школа запущена` stage in the superadmin panel.

The first commercial version uses one shared Karpix bot. Schools do not provide or host separate bot tokens.

## 📂 Project Structure
- `backend/app`: FastAPI Backend (Auth, Tenants API)
- `backend/bot`: Aiogram Bot (Middleware, Handlers)
- `backend/app/models.py`: Shared Database Schema (SQLModel)

## Operations

- PostgreSQL backup, offsite copy, clean restore, and restore-drill procedure: [`docs/BACKUP_RESTORE.md`](docs/BACKUP_RESTORE.md)
- Production release gates: [`docs/RELEASE_CHECKLIST.md`](docs/RELEASE_CHECKLIST.md)
- Self-service architecture and acceptance plan: [`docs/PLAN-self-service-schools.md`](docs/PLAN-self-service-schools.md)
