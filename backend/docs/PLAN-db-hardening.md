# PLAN-db-hardening.md - Database Hardening & Scaling

## Context & Objectives
Based on the Database Audit and Senior-level recommendations, we are implementing a "SaaS-Grade" database architecture that is secure, resilient, and ready for high-concurrency production.

### Core Goals
- **Automated Robust Migrations**: Moving to Alembic with **Migration Locking** to prevent parallel startup conflicts.
- **SQLi Protection**: Elimination of raw `exec()` risks and enforcement of parameterized queries.
- **Performance at Scale**: Strategic indexing, **Statement Timeouts**, and query optimization.
- **Resilience**: **Soft Delete** for critical entities and **Health Checks**.

---

## 🛠 Phase 1: Migration Infrastructure (Backend Specialist)
> *Goal: Professional migration lifecycle with zero race-conditions.*
- [ ] **Alembic Initialization**: Setup Alembic in the `backend/` directory.
- [ ] **Base Migration Generation**: Create the "ground truth" migration.
- [ ] **Migration Safety Lock**: 
    - Implement a file-level or DB-level lock (e.g., `postgresql_advisory_lock`) to ensure only one instance applies migrations.
- [ ] **Manual Auto-Run Logic**: Update `db.py` to trigger `alembic upgrade head` safely on startup.

## 🚀 Phase 2: Performance & Constraints (Database Architect)
> *Goal: Ensure the DB doesn't hang or leak resources.*
- [ ] **Strategic Indexing**:
    - Composite index on `(tenant_id, is_published)`.
    - Index on `joined_at` for analytics.
    - FK indexes.
- [ ] **Statement Timeouts**:
    - Configure `engine` with `connect_args={"options": "-c statement_timeout=30000"}` to prevent long-running queries from blocking the pool.
- [ ] **UUID Optimization**: Evaluate transition to **UUIDv7** for better index locality (retains time-sorting).

## 🛡 Phase 3: SQLi & Security Pass (Security Auditor)
> *Goal: Zero-trust approach to data entry.*
- [ ] **Raw Exec Removal**: Replace `session.exec(text(...))` with pure SQLModel `select()`.
- [ ] **Input Sanitization**: Total ban on f-strings in queries; enforced parameter binding.
- [ ] **Row-Level Security (RLS) Prep**: Design schema to allow future PostgreSQL RLS implementation for tenant isolation.

## 📈 Phase 4: Scaling & Resilience Foundations
- [ ] **Soft Delete Implementation**: 
    - Add `deleted_at: Optional[datetime]` to `Course`, `Module`, `Lesson`, and `User`.
    - Update query logic in `webapp.py` to filter out deleted items by default.
- [ ] **JSONB Optimization**: Update `admin_request_details` to use `JSONB` for flexible but indexed metadata.
- [ ] **Health Checks**: Implement a robust `/health/db` endpoint that verifies connectivity with a 2s timeout.

---

## 🎼 Agent Assignments
| Phase | Principal Agent | Verification Script |
|---|---|---|
| **Foundation** | `database-architect` | `schema_validator.py` |
| **Security** | `security-auditor` | `security_scan.py` |
| **Logic** | `backend-specialist` | `pytest` |

---

## 🏁 Verification Checklist
- [ ] All migrations run automatically and safely on `app` start.
- [ ] `security_scan.py` returns 0 critical vulnerabilities.
- [ ] Long-running queries (simulated) are killed by the timeout.
- [ ] Soft-deleted items are invisible to common API calls.
