# PLAN: Russian Localization

This plan outlines the orchestration of agents to translate the entire UI of the Telegram Learning SaaS platform to Russian. Per user request, translations will be hardcoded directly into the TSX/React components.

## Agents Involved
1. **Project Planner**: Creates this plan and coordinates the task breakdown.
2. **Frontend Specialist (Admin)**: Translates all pages in the `frontend-admin` application.
3. **Frontend Specialist (WebApp)**: Translates the `frontend-webapp` application (`App.tsx` and components).
4. **Test Engineer**: Verifies that the translation doesn't break any UI components and that the applications still build successfully.

## Phase 1: Planning
- [x] Create `docs/PLAN_LOCALIZATION.md`.
- [ ] Identification of all user-facing strings in `frontend-admin`.
- [ ] Identification of all user-facing strings in `frontend-webapp`.

## Phase 2: Implementation (Parallel)
- [ ] **Admin Translation**:
    - `Dashboard.tsx`
    - `Courses.tsx`
    - `CourseEditor.tsx`
    - `Students.tsx`
    - `SuperAdmin.tsx`
    - `LoginPage.tsx`
- [ ] **WebApp Translation**:
    - `App.tsx` and all included components.

## Phase 3: Verification
- [ ] Run `npm run build` for both apps to ensure no syntax errors were introduced.
- [ ] Manual check of critical flows (labels, buttons, placeholders).

---

## User Review Required

✅ **Plan oluşturuldu: docs/PLAN_LOCALIZATION.md**

Onaylıyor musunuz? (Y/N)
- Y: Implementation başlatılır
- N: Planı düzeltirim
