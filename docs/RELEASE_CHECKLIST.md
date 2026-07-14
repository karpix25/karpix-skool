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

## Backup Readiness

- Follow `docs/BACKUP_RESTORE.md`; verify the newest PostgreSQL dump and checksum before release.
- Confirm the scheduled backup reports success and the offsite copy is present when configured.
- Keep the latest monthly clean-database restore drill within the recorded pilot RTO.

## Self-Service Pilot Gates

- Apply Alembic through head `e4f5a6b7c8d9` before starting the new application version.
- Verify one complete owner-invite, group-connect, publish, student-join path on staging.
- Configure an HTTPS support URL for every pilot school.
- Confirm the shared Karpix bot is an administrator in each connected learning group; do not collect client bot tokens in v1.
- Keep payment automation disabled until a verified provider contract and idempotent webhook flow are implemented; activate subscriptions manually in the superadmin panel.
- Obtain legal review and publish operator-specific terms, privacy, retention/deletion/export, cancellation/refund, and processor disclosures before accepting paid schools.
- Record a successful offsite backup and clean restore drill. Script validation alone is not evidence of recoverability.
- Follow `docs/DEPLOY_ROLLBACK.md` and record the release evidence for staging and production.
- Follow `docs/INCIDENT_RESPONSE.md`; prove that synthetic health, bot, and worker failures reach the on-call channel.
- Complete `docs/PILOT_VALIDATION.md` for three new schools without manual database edits.
