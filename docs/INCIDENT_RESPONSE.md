# Incident Response Runbook

## Severity and response target

| Severity | Example | Acknowledge | Update cadence |
| --- | --- | --- | --- |
| SEV-1 | Cross-tenant exposure, total outage, confirmed data loss | 15 min | 30 min |
| SEV-2 | Bot/worker unavailable, onboarding or publishing broadly broken | 30 min | 60 min |
| SEV-3 | One-school degradation with a safe workaround | 4 business hours | Daily |

These are pilot operating targets. Publish actual support hours and escalation
contacts before accepting paid schools.

## First response

1. Name an incident commander and timestamp the incident.
2. Preserve request IDs, tenant ID, affected user IDs, release SHA, logs, and
   screenshots without copying secrets or raw authentication payloads.
3. Determine scope across API, database, Redis, Telegram bot, generation
   worker, R2, Mux, and AI/Open Notebook providers.
4. Stop harmful writes or disable the affected feature when containment is
   safer than continued operation.
5. Communicate confirmed impact only; distinguish unavailable, delayed, and
   permanently lost data.

## Mandatory containment cases

- **Cross-tenant access:** disable the affected route/feature, preserve audit
  evidence, identify every tenant/object read, and rotate exposed credentials.
- **Payment inconsistency:** keep payment automation disabled, preserve provider
  event payload identifiers, and reconcile manually before changing access.
- **Migration failure:** follow `docs/DEPLOY_ROLLBACK.md`; do not let workers
  write against an uncertain schema.
- **Storage exposure:** revoke or rotate URLs/credentials and identify accessed
  object keys before changing lifecycle rules.
- **Data loss:** stop writers and follow `docs/BACKUP_RESTORE.md`.

## Recovery and closure

Verify `/health`, bot heartbeat, worker processing, owner access, one student
lesson, and protected attachment access. For onboarding incidents, replay the
owner path on staging before closing.

The closure record must contain timeline, root cause, affected tenants, data
impact, remediation, tests added, owner, and due dates. SEV-1 and recurring
SEV-2 incidents require a written postmortem and a regression test or monitoring
control.

## Alert delivery drill

At least monthly, trigger a safe synthetic failure for the public health check,
bot heartbeat, and generation worker. Record whether the alert reached the
on-call channel, acknowledgement time, and recovery notification. A configured
DSN or dashboard without a delivered notification is not alert readiness.
