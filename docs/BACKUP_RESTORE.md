# PostgreSQL Backup and Restore Runbook

This runbook covers the Karpix application PostgreSQL database. It does not back
up R2 objects, Mux assets, Redis, or Open Notebook/SurrealDB data.

## Pilot recovery targets

- RPO: 24 hours with the default daily schedule. Use a six-hour schedule for a
  paid pilot that cannot tolerate a full day of lost progress.
- RTO: four hours for a clean PostgreSQL restore and application smoke test.
- Retention: 14 local days by default, plus at least 30 days in encrypted,
  versioned offsite storage.

These are pilot targets, not measured guarantees. Record actual duration and
data loss exposure after every restore drill.

## Environment contract

The scripts default to `PG_BACKUP_MODE=compose` and run PostgreSQL 15 tools in
the existing Compose `db` service. Run them from a checkout whose Compose stack
points at the intended database.

The existing `pgbackup` Compose service is local-only and does not provide this
checksum/offsite contract. Keep it as temporary overlap until the host scheduler
for these scripts has produced and verified an offsite recovery point; do not
count its presence alone as backup readiness.

| Variable | Required | Purpose |
| --- | --- | --- |
| `PG_BACKUP_MODE` | No | `compose` (default) or `direct`. |
| `BACKUP_DIR` | No | Local destination; default `backups/postgres`. |
| `BACKUP_RETENTION_DAYS` | No | Local retention; default `14`. |
| `PGHOST`, `PGPORT`, `PGUSER`, `PGDATABASE` | Direct mode | libpq connection fields. |
| `PGPASSWORD` or `.pgpass` | Direct mode when required | Database authentication. Do not put it in scripts or shell history. |
| `PGMAINTENANCE_DB` | No | Database used by direct-mode drop/create; default `postgres`. |
| `BACKUP_OFFSITE_RCLONE_REMOTE` | No | `remote:path` destination configured outside the repo. |
| `BACKUP_OFFSITE_S3_URI` | No | `s3://bucket/prefix` destination for AWS CLI. |
| `BACKUP_S3_ENDPOINT_URL` | No | Endpoint for an S3-compatible provider such as R2. |
| `RESTORE_DATABASE` | Restore only | Explicit restore target when it differs from the configured DB. |
| `RESTORE_TEST_DATABASE_PATTERN` | No | Bash regex identifying disposable test/drill databases. |

Configure exactly one offsite mechanism. Credentials belong in the host's
rclone config, AWS credential chain, workload identity, or secret manager.

## Create and verify a backup

```bash
scripts/backup/backup-postgres.sh
scripts/backup/verify-postgres-backup.sh backups/postgres/<database>-<timestamp>.dump
```

The backup command writes a PostgreSQL custom-format dump, rejects empty or
invalid archives, writes a SHA-256 companion file, uploads both files when an
offsite target is configured, and only then applies local retention.

Example direct connection:

```bash
PG_BACKUP_MODE=direct \
PGHOST=db.example.internal PGPORT=5432 PGUSER=backup_reader PGDATABASE=app \
scripts/backup/backup-postgres.sh
```

The direct backup role needs `CONNECT` and read access to all application
schemas, tables, and sequences. Keep the local `pg_dump` major version equal to
or newer than the server version.

## Restore into a clean drill database

Checksum and archive validation happen before any destructive database action.
The restore command always requires `--clean-db`; it drops and recreates the
target database to prevent stale objects from surviving the drill.

```bash
PG_BACKUP_MODE=direct \
PGHOST=127.0.0.1 PGPORT=5432 PGUSER=postgres PGDATABASE=karpix_restore_drill \
scripts/backup/restore-postgres.sh \
  --clean-db \
  --database karpix_restore_drill \
  backups/postgres/app-<timestamp>.dump
```

The restore identity must be allowed to terminate connections and drop/create
the target database. Test names containing `test`, `restore`, or `drill` do not
need an extra confirmation. Every other database requires an exact confirmation:

```bash
scripts/backup/restore-postgres.sh \
  --clean-db \
  --database app \
  --confirm-database app \
  --maintenance-confirmed \
  backups/postgres/app-<timestamp>.dump
```

For an actual production restore, enable maintenance mode and stop `backend`,
`bot`, and `lesson_generation_worker` before dropping the database. Keep the
`db` service running. `--maintenance-confirmed` is an explicit acknowledgement
that these writers are stopped. Do not reopen traffic until verification passes.

## Post-restore verification

Run these against the restored database and record the results with the drill:

```sql
SELECT current_database(), now();
SELECT count(*) AS tenants FROM tenant;
SELECT count(*) AS users FROM "user";
SELECT count(*) AS courses FROM course WHERE deleted_at IS NULL;
SELECT count(*) AS lessons
FROM lesson l
JOIN module m ON m.id = l.module_id
JOIN course c ON c.id = m.course_id
WHERE l.deleted_at IS NULL AND m.deleted_at IS NULL AND c.deleted_at IS NULL;
SELECT version_num FROM alembic_version;
```

Then start the application against the restored database and verify:

1. `/health` returns success.
2. A superadmin can select a school.
3. A school admin can open a course and lesson.
4. A student can open a published lesson.
5. A protected attachment is downloadable through the backend.
6. No generation worker is replaying stale jobs unexpectedly.

## Scheduling and restore drills

- Schedule `backup-postgres.sh` with systemd timer, cron, or the hosting
  platform scheduler. Capture exit status and alert on any non-zero result.
- Run daily at minimum; a paid pilot should run every six hours.
- Run `verify-postgres-backup.sh` after transferring a backup between systems.
- Once per month, restore the newest offsite backup into a newly created drill
  database, execute the verification checklist, record elapsed time, then delete
  the drill database.
- Once per quarter, perform the drill on a separate host or managed PostgreSQL
  instance to prove recovery does not depend on the production volume.

## Object storage and external-service caveats

PostgreSQL stores references to R2 and Mux assets, not the asset bytes. A valid
database restore can therefore contain broken attachments if object retention
is shorter than database retention.

- Enable bucket versioning where supported and use a separate lifecycle policy.
- Back up private R2 objects independently; do not assume a public CDN is a backup.
- Test restoration of at least one protected lesson attachment during every drill.
- Mux-hosted video needs its own retention/export policy; `pg_dump` only preserves
  playback and asset identifiers.
- Redis is treated as disposable cache/state and is not part of this restore.
- Open Notebook/SurrealDB is upstream generation state. Back it up separately if
  reproducing source notebooks is an operational requirement.
- Encrypt offsite backups at rest and in transit, restrict delete permissions,
  and test that lifecycle rules do not remove the checksum before the dump.

## Failure handling

- Never overwrite the only known-good backup.
- If checksum or archive validation fails, stop before touching the database.
- If restore fails after database recreation, keep traffic stopped, preserve the
  failing dump and logs, fix the cause, and repeat from a newly clean database.
- If a dump succeeds but offsite copy fails, the backup command exits non-zero;
  investigate before considering that recovery point durable.
