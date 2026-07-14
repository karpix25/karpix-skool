# Production Deploy and Rollback Runbook

This runbook covers the shared Karpix application stack. Hosting-specific TLS,
DNS, image registry, and secret-manager steps remain owned by the platform.

## Release evidence

Record the following before every production deploy:

- commit SHA and CI run URL;
- current Alembic revision and target revision;
- newest verified offsite PostgreSQL backup and checksum;
- operator, start time, maintenance window, and rollback owner;
- staging smoke result from `docs/PILOT_VALIDATION.md`.

Do not deploy when CI is red, the backup cannot be verified, required secrets
are missing, or a migration has no reviewed forward-fix/rollback decision.

## Preflight

```bash
git status --short
git rev-parse HEAD
docker compose config --quiet
scripts/backup/backup-postgres.sh
scripts/backup/verify-postgres-backup.sh backups/postgres/<dump>.dump
```

Confirm that `/health` is green and capture the current image identifiers,
container state, and `alembic_version`. Production credentials must come from
the hosting secret store, never a committed file.

## Staging deploy

1. Deploy the exact release SHA to the staging stack.
2. Allow the backend entrypoint to apply migrations once. Workers and the bot
   use `SKIP_MIGRATIONS=1` and must not race the backend.
3. Wait for database, Redis, backend, bot, Open Notebook, and worker health.
4. Run the complete pilot smoke in `docs/PILOT_VALIDATION.md`.
5. Inspect backend, bot, and worker logs for new errors before production.

## Production deploy

1. Announce the maintenance window when the migration or contract change can
   interrupt writes.
2. Stop the bot and generation worker for migration-sensitive releases.
3. Deploy the backend and wait for migrations and `/health` to succeed.
4. Deploy the webapp, then restart the bot and worker.
5. Verify owner login, one published student lesson, a protected attachment,
   Telegram bot heartbeat, and one non-billable generation smoke when safe.
6. Watch error rate, latency, worker failures, and onboarding failures for at
   least 15 minutes. Record the outcome in the release evidence.

## Rollback decision

Prefer an application rollback when the database migration is backward
compatible. Never run an Alembic downgrade blindly.

- **No schema change:** restore the previous images and repeat smoke checks.
- **Backward-compatible schema change:** restore previous images and leave the
  additive schema in place; schedule a reviewed cleanup later.
- **Incompatible or destructive migration:** keep traffic stopped and choose a
  reviewed forward-fix or database restore. The rollback owner must record the
  expected data-loss window before restoring.

For a database restore, follow `docs/BACKUP_RESTORE.md`. Stop all writers, use a
clean target database, verify checksum first, and do not reopen traffic until
the post-restore checks pass.

## Failed migration

1. Keep backend, bot, and worker traffic stopped.
2. Preserve entrypoint and PostgreSQL logs.
3. Read `alembic_version` and compare it with the release target.
4. Do not rerun a partially applied migration until its transactional behavior
   is understood.
5. Apply a reviewed forward-fix when possible; otherwise follow the database
   restore path above.
6. Re-run the staging migration from a production-like backup before retrying
   production.
