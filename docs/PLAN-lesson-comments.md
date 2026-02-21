# PLAN-lesson-comments.md

## 🎯 Goal
Implement two-way synchronized comments for lessons between the Web App (TWA) and a dedicated Telegram Topic.

## 🏗️ Architecture & Logic
1.  **Post-per-Lesson:** When a lesson is published, the bot sends an automated post to a specific Telegram Topic (e.g., "Обсуждения").
2.  **Replies as Comments:** 
    *   Any reply to that post in Telegram is registered as a comment on that lesson in the DB.
    *   Any comment sent via the Web App is sent as a reply to that post in Telegram by the bot.
3.  **Identity:** Since all users log in via Telegram, we map `telegram_id` to the local `User` and `TenantMember`.

---

## 📅 Roadmap

### Phase 1: Database & Models (P0)
- **File:** `backend/app/models.py`
- [ ] Add `comments_topic_id` to `Tenant` model.
- [ ] Add `tg_post_id` (BigInteger) to `Lesson` model (to store the root message ID in TG).
- [ ] Create `LessonComment` model:
    - `id` (UUID)
    - `lesson_id` (FK)
    - `user_id` (FK)
    - `text` (str)
    - `tg_message_id` (BigInteger, nullable)
    - `created_at` (datetime)

### Phase 2: Backend - Telegram Integration (P1)
- **Files:** `backend/app/services/telegram.py`, `backend/bot/handlers.py`
- [ ] Create `create_lesson_post_in_tg(lesson_id)`: Sends "Lesson Published" message to the comments topic.
- [ ] Create `send_comment_to_tg(comment_id)`: Appends the comment as a reply in TG.
- [ ] Update Bot Handlers: Listen for replies in `comments_topic_id`. If a reply is for a message linked to a lesson, save it to `LessonComment`.

### Phase 3: Backend - API Routes (P1)
- [ ] Create `backend/app/routes/comments.py`:
    - `GET /lessons/{id}/comments`: Fetch list of comments.
    - `POST /lessons/{id}/comments`: Post a new comment.
- [ ] Register router in `main.py`.

### Phase 4: Frontend - UI Components (P2)
- [ ] Create `LessonComments.tsx`:
    - Chat-like interface (bubbles, avatars).
    - Send button.
    - Auto-refresh or basic polling for new comments.
- [ ] Integrate into `LessonView` (main lesson page).

---

## 🧪 Verification Checklist
- [ ] Admin publishes lesson -> Post appears in TG Topic.
- [ ] Student writes in App -> Reply appears in TG Topic under the correct post.
- [ ] Student replies in TG Topic -> Comment appears under the lesson in the App.
- [ ] Avatar and username correctly displayed in both places.

## 👥 Assignments
- **Backend Specialist:** DB models, Telegram services, Bot handlers.
- **Frontend Specialist:** UI components, API integration.
- **Orchestrator:** Final verification and E2E testing.
