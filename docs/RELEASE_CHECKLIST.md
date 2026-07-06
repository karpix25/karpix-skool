# Release Checklist

## Secrets Hygiene

- Keep real `.env` files out of git. Use `backend/.env.example` as the template.
- Keep real ngrok credentials out of git. Copy `ngrok.yml.example` to `ngrok.yml` only for local tunneling.
- External blocker: revoke or rotate the exposed ngrok authtoken in the ngrok dashboard before considering this incident closed.

## Production Env Contract

- Set `POSTGRES_USER`, `POSTGRES_PASSWORD`, and `POSTGRES_DB`; production Compose must not rely on `postgres/postgres` defaults.
- Set `SECRET_KEY`, `BOT_TOKEN`, `BOT_USERNAME`, `FRONTEND_URL`, `WEBAPP_URL`, and `VITE_API_URL` before deploying.
- Keep `VITE_API_URL` pointed at the public backend API origin used by the frontend build.

## CI Gates

- Python dependency audit failures block CI.
- Frontend lint, tests, build, and high-severity npm audit failures block CI.
- Docker Compose config validation must pass with explicit release env values.
