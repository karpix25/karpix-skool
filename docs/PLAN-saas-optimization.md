# PLAN: SaaS High-Load Optimization (Easypanel Edition)

**Goal**: Scale the platform to 10,000+ daily users while leveraging **Easypanel** for infrastructure stability and ensuring 100% uptime and data isolation.

---

## 🏗️ Phase 1: Infrastructure via Easypanel
Easypanel manages Docker/Traefik, so we leverage its native features.

- **[x] Zero Downtime Deployment**: Handled by Easypanel (Rolling Updates).
- **[ ] Horizontal Scaling**: Increase "Replicas" for the backend service in Easypanel (ensure it stays stateless).
- **[ ] Automated Backups**: Configure Easypanel Database Backups to R2/S3 (Frequency: 6h).
- **[ ] Resource Allocation**: Assign dedicated CPU/RAM limits in Easypanel settings (8 cores / 24GB available).

## �️ Phase 2: Foolproof Tenant Isolation
Preventing "neighbor data" leakage by design, not just by discipline.

- **[ ] Strict Dependency Pattern**: Refactor all "protected" endpoints to use a common `TenantContext` dependency.
- **[ ] Global Filter Logic**: Implement a helper or decorator that ensures every query to `Course`, `Module`, `Lesson` includes a `tenant_id` check implicitly.
- **[ ] Audit Trail**: Add simple logging of which Admin accessed which `tenant_id` to detect anomalies.

## 🚀 Phase 3: Application Performance (10k Load)
Ensuring the Python backend doesn't become the bottleneck.

- **[ ] Redis Query Caching**: Use the existing Redis (currently for Rate Limiting) to cache course metadata.
    - *Why*: 10k users hitting the DB for the same course list is wasteful.
- **[ ] Paging & Optimization**: Ensure `list` endpoints have proper limit/offset to prevent memory spikes with large schools.
- **[ ] Static Assets**: Offload all heavy images/videos to Cloudflare R2 (already started, need to ensure 100% coverage).
- **[ ] Background Tasks**: Move heavy logic (notifications, analytics aggregation) to `FastAPI BackgroundTasks` or a Celery-lite worker.

## 📈 Phase 4: Production Monitoring
- **[ ] Sentry Integration**: Real-time error tracking and alerting (crucial for "never turns off").
- **[ ] Custom Health Checks**: Detailed `/health` endpoint that checks DB and Redis connectivity.
- **[ ] Performance Tracing**: Use Sentry or OpenTelemetry to find slow SQL queries.

---

## 🏁 Phase X: Verification
- **[ ] Isolation Test**: Use a script to try and access Tenant B's lesson using Tenant A's token.
- **[ ] Load Stress Test**: Simulating 5,000 requests/min via Locust.
- **[ ] Env Cleanup**: Ensure no `development` flags are active in production.

> [!NOTE]
> **Easypanel Tip**: Since you are using Easypanel, we don't need to manually configure Traefik labels. Just ensure the environment variables are correctly mapped in the Easypanel Dashboard.
