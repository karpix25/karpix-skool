# PLAN: Multi-Profile Session Mixing Fix

When a user switches Telegram profiles on the same device, the Mini App might reuse a stale `localStorage` token from a previous profile, leading to incorrect role/access (e.g., everyone seeing the Super Admin panel).

## Phase 1: Problem Analysis
- [ ] Confirmed: `localStorage` is likely shared across Telegram accounts in the same app context on some devices.
- [ ] Current `checkAuth` prioritizes `localStorage` tokens if they are valid, even if the new `WebApp.initData` belongs to a different user.

## Phase 2: Frontend Fix (AuthContext.tsx)
- [ ] Modify `checkAuth` to extract the `telegram_id` from `WebApp.initDataUnsafe.user.id`.
- [ ] Compare this `telegram_id` with the `telegram_id` of the user returned by `refreshProfile`.
- [ ] If they mismatch, or if `initData` is present and we want to be safe, force a re-login via `/webapp/login`.

## Phase 3: Backend Verification
- [ ] Ensure `/webapp/login` correctly handles the transition and returns the correct new user.
- [ ] Verify that `is_super_admin` is correctly determined for the *new* user.

## Phase 4: Verification
- [ ] Test switching between profiles (simulated or real).
- [ ] Verify that logs show "User mismatch, clearing session" if a different account opens the app.

## Verification Checklist
- [ ] User A logs in -> User A profile loaded.
- [ ] User B opens app (with User A's token in storage) -> User B profile loaded correctly.
- [ ] Super Admin view is ONLY visible when the active Telegram account is the Super Admin.
