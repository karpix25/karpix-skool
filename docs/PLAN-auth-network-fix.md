# PLAN: Auth Network Error Fix

The user is experiencing a `Network Error` when the frontend (webapp.karpix.com) tries to communicate with the backend (zadnik.karpix.com/webapp/login). 

## Phase 1: Infrastructure Analysis
- [ ] Verify DNS setup for `zadnik.karpix.com`.
- [ ] Inspect reverse proxy configuration (Nginx/Caddy/etc.) that routes traffic to the backend container on port 8000.
- [ ] Check backend SSL/TLS certificate validity.

## Phase 2: Backend Validation
- [x] Verify backend container logs to see if requests are even reaching the FastAPI app. (FOUND NameError: Optional not defined)
- [x] Fix NameError in `webapp.py`.
- [ ] Test backend health via a simple `curl -I https://zadnik.karpix.com/`.

## Phase 3: CORS & Headers check
- [ ] Although CORS is `allow_origins=["*"]`, verify if preflight (OPTIONS) requests are being blocked by a proxy.
- [ ] Check if `ngrok-skip-browser-warning` or other headers are causing issues with certain proxies.

## Phase 4: Implementation
- [ ] Adjust reverse proxy configuration if necessary.
- [ ] Update CORS settings if specific origins are required.

## Verification Checklist
- [ ] `curl https://zadnik.karpix.com/` returns 200 OK.
- [ ] Mobile login succeeds without Network Error.
- [ ] Desktop login succeeds.
