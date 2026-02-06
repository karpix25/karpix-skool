# Plan: Debugging Backend and Mini App Connectivity

This plan coordinates multiple agents to resolve the current deployment blockers: the `NameError` in the backend and the "not opening" issue in the Telegram Mini App.

## Phase 1: Planning
The `project-planner` will define the steps to investigate both issues.

## Phase 2: Implementation (After Approval)

### [Component: Backend]
- **Agent**: `backend-specialist` / `debugger`
- **Task**: 
  - Verify `app/config.py` contains the correct imports.
  - Check if any other files are missing imports after recent refactors.
  - Ensure the pushed code is actually what the server is pulling.

### [Component: Devops / Infrastructure]
- **Agent**: `devops-engineer`
- **Task**:
  - Investigate `VITE_API_URL` configuration in Easypanel.
  - Check Nginx logs for any certificate or CSP (Content Security Policy) issues that might block Telegram Mini App from loading.
  - Verify that the `webapp` service is correctly exposing port 80 and the domain is linked.

### [Component: Frontend]
- **Agent**: `frontend-specialist`
- **Task**:
  - Verify that the unified `App.tsx` handles the initial Telegram `initData` correctly.
  - Ensure the build artifacts (`dist` folder) are correctly served by Nginx.

## Verification Plan
1. **Local Verification**: Run the backend and bot locally to ensure `Optional` error is gone.
2. **Connectivity Check**: Use a tool to check if the `webapp` URL is reachable and returning valid HTML.
3. **Log Audit**: Review server logs after deployment for any runtime errors.
