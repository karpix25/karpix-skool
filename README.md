# Telegram Learning SaaS Platform

A multi-tenant platform for managing courses and communities in Telegram.

## 🚀 Quick Start in 3 Steps

### 1. Configure Environment
Create a `.env` file in `backend/`:
```bash
cp backend/.env.example backend/.env
# Edit BOT_TOKEN with your Telegram Bot Token
```
*(An example `.env` has been created for you)*

### 2. Start the Stack (Local)
Run the entire system (DB, Redis, Backend, Bot) with Docker:
```bash
docker-compose up --build
```
- **Backend API:** `http://localhost:8000/docs`
- **Postgres:** Port `5432`
- **Redis:** Port `6379`
- **Bot:** Auto-starts polling

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
