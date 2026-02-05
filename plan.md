# SaaS Specification: Telegram Learning Platform (Multi-Tenant)

## 1. Architecture Overview
A multi-tenant SaaS where **"School Owners"** (Tenants) can create their own learning communities inside Telegram.
* **The Platform Owner (You):** Manages the SaaS, subscriptions, and global settings.
* **The Tenant (School Owner):** Signs up, connects their Telegram Group, and uploads courses.
* **The Student:** Joins a specific Tenant's community, gains XP in *that* specific group, and unlocks content in *that* specific Mini App.

**Core Tech:** Python (FastAPI), aiogram (Bot), React (Mini App), PostgreSQL (Row-Level Security strategy).

---

## 2. Database Schema (Multi-Tenant)

**CRITICAL RULE:** All tables (except `Tenants` and `PlatformUsers`) MUST have a `tenant_id` column to ensure data isolation.

### A. Global Entities
* **Tenant (School)**
    * `id`: UUID (Primary Key).
    * `name`: String ("Crypto Academy", "Yoga Class").
    * `owner_user_id`: ForeignKey (The admin of this school).
    * `telegram_group_id`: BigInt (The ID of the connected chat).
    * `bot_token_override`: String (Optional: if they want their own branded bot, otherwise use the shared Platform Bot).
    * `subscription_status`: Enum (active, past_due).

* **User (Global Profile)**
    * `id`: UUID.
    * `telegram_id`: BigInt (Unique).
    * `username`: String.
    * `avatar_url`: String.

### B. Tenant-Scoped Entities (The "School" Data)
* **TenantMember (Student in a School)**
    * `tenant_id`: ForeignKey.
    * `user_id`: ForeignKey.
    * `role`: Enum (`student`, `admin`, `moderator`).
    * `joined_at`: DateTime.
    * **Gamification (Scoped to this school):**
        * `xp`: Integer.
        * `level`: Integer.
    * **Drip Tracking:**
        * `cohort_start_date`: DateTime (Used for relative drip content).

* **Course**
    * `id`: UUID.
    * `tenant_id`: ForeignKey.
    * `title`: String.
    * `is_published`: Boolean.

* **Module**
    * `id`: UUID.
    * `course_id`: ForeignKey.
    * `unlock_type`: Enum (`immediate`, `level_based`, `time_relative`, `time_fixed`).
    * `unlock_value`: String/Int.
        * *If `level_based`: 5 (Level 5 required).*
        * *If `time_relative`: 3 (Open 3 days after student joins).*
        * *If `time_fixed`: "2026-06-01" (Opens on specific date).*

* **Lesson**
    * `id`: UUID.
    * `module_id`: ForeignKey.
    * `video_provider`: Enum (`youtube_unlisted`, `mux`, `vimeo`).
    * `video_id`: String.

---

## 3. Functional Logic

### Feature 1: Tenant Onboarding (The "Setup" Flow)
How a School Owner connects their group to your SaaS:
1.  **Web Dashboard:** Owner creates a "School" -> gets a unique `connect_code` (e.g., `START-123`).
2.  **Telegram:** Owner adds your SaaS Bot to their Private Group as Admin.
3.  **Linking:** Owner types `/setup START-123` in the group.
4.  **Bot Action:**
    * Verifies code.
    * Saves `group_id` into the `Tenant` table.
    * Replies: "✅ School Connected! I will now track XP here."

### Feature 2: Smart Content Unlocking (The Engine)
When a student requests the Course List API (`GET /api/courses`):

**Logic Loop for each Module:**
1.  Check `unlock_type`:
    * **Level Based:** Is `TenantMember.level` >= `Module.unlock_value`?
    * **Time Relative (Drip):** Is `(Now - TenantMember.cohort_start_date)` >= `X days`?
    * **Time Fixed:** Is `Now` >= `Specific Date`?
2.  **Result:**
    * If **YES**: Return `is_locked: false`.
    * If **NO**: Return `is_locked: true` AND `unlock_message` (e.g., "Opens in 2 days" or "Reach Level 5").

### Feature 3: The Tenant Dashboard (Web Admin)
A separate React frontend for School Owners (not the Mini App).
* **Course Builder:**
    * "Add Module" -> Select "Unlock Rule" (Level vs Time).
    * "Upload Video" -> Integration with Mux/YouTube API.
* **Student Manager:**
    * List of all students in their group.
    * Ability to manually edit `cohort_start_date` (to give early access).
    * "Ban" button (removes from DB + kicks from Telegram Group).
* **Analytics:**
    * "Most Active Members" (by XP).
    * "Drop-off Rate" (where students stop watching lessons).

---

## 4. Bot Logic (Multi-Context)
The bot receives updates from *many* groups.
**Middleware Logic:**
1.  **Receive Update:** `message` from `chat_id: -100123456789`.
2.  **Identify Tenant:** Query Cache/DB: "Which Tenant owns group `-100123456789`?"
    * *If none found, ignore.*
3.  **Identify User:** Get `user_id` from message.
4.  **Process XP:**
    * `UPDATE TenantMember SET xp = xp + 1 WHERE user_id = ... AND tenant_id = ...`
5.  **Level Up Check:**
    * If new level reached -> Send message to *that specific chat*: "Congratulations!"

---

## 5. Development Roadmap for Agent

1.  **Phase 1: Database & Auth.** Setup `Tenant`, `User`, and `TenantMember` models. Create the API for School Owners to register.
2.  **Phase 2: The Bot.** Implement `/setup` command and the Multi-Tenant Middleware (mapping Group ID -> Tenant ID).
3.  **Phase 3: Course Builder.** Create the API for CRUD courses with the complex `unlock_type` logic.
4.  **Phase 4: The Mini App.** Build the student view that checks the locking rules before playing a video.