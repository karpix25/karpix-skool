# Self-Service School Pilot Validation

Run this checklist on staging with a new Telegram account and a new school. Do
not repair rows manually during the run. Record the release SHA, tenant ID,
timestamps, screenshots, failures, and operator assistance.

## Owner journey

1. Enter through the shared Karpix bot and create or claim the school.
2. Confirm owner membership and trial status without reloading or relogging.
3. Complete school name, branding, description, and HTTPS support contact.
4. Connect the intended Telegram group and confirm the shared bot is admin.
5. Create a course, module, and lesson; publish only after owner review.
6. Open the school as a student and verify the published lesson and attachment.
7. Invite a real test student and confirm the student quota/roster update.
8. Finish onboarding and confirm a second school still has independent progress.
9. Confirm the owner can see trial status, limits, expiry behavior, and the
   support action.

## Isolation and lifecycle

- Owner A cannot read or mutate school B through API identifiers or UI routes.
- Student A cannot access school B lessons, files, or membership state.
- Expired, past-due, and suspended schools remain readable but cannot publish,
  upload, invite, or start AI jobs.
- Course, student, AI, and storage limits fail safely at the boundary.
- Replaying an invite token and repeating a subscription activation are
  idempotent and do not create duplicate owners or events.

## Operations

- `/health`, bot heartbeat, and worker health are green.
- A synthetic failure delivers an alert to the responsible operator.
- The newest offsite backup and checksum exist.
- The latest clean restore drill is within the pilot RTO.
- Deploy, rollback, incident, support, privacy, cancellation/refund, retention,
  deletion, and export procedures are published for the pilot team.

## Release gate

Repeat the owner journey for three new schools in sequence. The pilot gate passes
only when all three launch without database edits and every failure has an owner
and resolution. Payment activation remains manual in v1.
