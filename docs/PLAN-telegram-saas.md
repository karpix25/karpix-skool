# IMPL PLAN: Multi-Tenant Telegram Learning SaaS

> **Goal:** Build a multi-tenant platform where "School Owners" can manage courses and students via Telegram and a Web Dashboard.
> **Source Spec:** `plan.md`

## 🔴 User Review Required

### 1. Technology Choices (Assumed)
- **Backend:** Python + FastAPI + PostgreSQL (AsyncPG) + SQLAlchemy
- **Bot:** aiogram 3.x (latest stable)
- **Frontend (Admin):** React (Vite) or Next.js? *Assumed: React + Vite for simplicity.*
- **Frontend (Mini App):** React (Vite) optimized for Telegram WebApp (TWA).
- **Local Dev:** Docker Compose (DB + App + Redis).

### 2. Critical Questions
- **Video Hosting:** Implementation for "Mux/Vimeo" will require API keys. *We will mock this for local dev.*
- **Payment:** Subscription logic for "Tenant" status is defined in schema but payment integration (Stripe/Star) is not detailed. *Scope limited to DB status flags.*

---

## 🏗️ Proposed Phases

### Phase 1: Foundation (DB & Auth)
**Goal:** Reliable multi-tenant schema and owner registration.

#### [NEW] `backend/`
- **Database:** PostgreSQL with `tenants`, `users`, `tenant_members` tables.
- **Auth:** JWT-based auth for School Owners.
- **API:**
  - `POST /auth/register` (Owner signup)
  - `POST /tenants` (Create "School")

### Phase 2: The Bot (Tenant Mapping)
**Goal:** Bot can be added to groups and link them to tenants.

#### [NEW] `bot/`
- **Framework:** `aiogram`
- **Middleware:** `MultiTenantMiddleware` (Cache: Group ID -> Tenant ID).
- **Commands:**
  - `/setup <code_id>` (Link group to tenant)
  - `/status` (Check connection)
- **Event Handlers:**
  - `ChatMemberUpdated` (Track joins/leaves)
  - `Message` (Track activity for XP)

### Phase 3: Course Management (Admin Dashboard)
**Goal:** Web interface for Owners to create content.

#### [NEW] `frontend-admin/`
- **Stack:** React + Vite + Tailwind
- **Features:**
  - Course Builder (Modules, Lessons)
  - Drip Rule Configuration (Level vs Time)
  - Student List (Ban/Edit)

### Phase 4: Sudo-Learning (The Engine)
**Goal:** The core "Unlock" logic API.

#### [MODIFY] `backend/`
- **Logic:** `is_content_locked(user, content_rule)`
- **API:** `GET /api/student/courses` (Returns personalized locked/unlocked state).

### Phase 5: Telegram Mini App (Student View)
**Goal:** The TWA where students consume content.

#### [NEW] `frontend-twa/`
- **Stack:** React + Telegram WebApp SDK
- **Features:**
  - "My Courses" List
  - Video Player (Youtube/Mux embed)
  - "Locked" State UI with unlocking instructions.

---

## ✅ Verification Plan

### 1. Local Launch (Docker)
Run the entire stack locally with one command.

```bash
# Start DB, Redis, Backend, and Bot
docker-compose up --build
```

### 2. Manual Testing Steps

**A. Tenant Setup**
1. call API `POST /register` -> Get Token.
2. call API `POST /tenants` -> Get `connect_code`.
3. Add Bot to a real Telegram Group.
4. Send `/setup <code>` -> Verify "✅ Connected".

**B. Content Locking**
1. Create a Course with "Level 2 required".
2. As a new user (Level 1), open Mini App -> Verify "LOCKED".
3. Send messages in group -> Gain XP -> Reach Level 2.
4. Refresh Mini App -> Verify "UNLOCKED".
