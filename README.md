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

### 3. Verify
1. **Open Swagger UI:** Go to `http://localhost:8000/docs`
2. **Register Owner:** `POST /auth/register`
3. **Login:** `POST /auth/login` -> Copy Access Token.
4. **Create School:** `POST /tenants` (Authorize with token) -> Get `connect_code` (e.g. `START-UUID`).
5. **Connect Bot:** 
   - Add your bot to a Telegram Group.
   - Send `/setup <TENANT_ID>` (Use the ID from step 4).
   - Bot should reply "✅ CONNECTED!".
6. **Test XP:** Send messages in the group. Check database `tenantmember` table to see XP increase.

## 📂 Project Structure
- `backend/app`: FastAPI Backend (Auth, Tenants API)
- `backend/bot`: Aiogram Bot (Middleware, Handlers)
- `backend/app/models.py`: Shared Database Schema (SQLModel)
