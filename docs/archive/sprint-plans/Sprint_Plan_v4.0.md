---
**STATUS: SUPERSEDED - HISTORICAL ARCHIVE**  
This document is preserved for historical reference only.  
**Current version:** Sprint_Plan_v8.0.md  
**Archived:** October 23, 2025  
---

> Deprecated (2025-08-30): This document is superseded by Sprint_Plan_v4.1.md. See [Sprint_Plan_v4.1.md](Sprint_Plan_v4.1.md).

# Sprint Plan v4.0: Operation: Control Panel & Governance

Version: 4.0  
Date: 2025-08-29  
Epic: Control Panel for CI/CD + Data Governance  
Objective: Deliver an admin "Control Panel" that triggers/monitors key GitHub workflows (Verify RLS, Seed Blog, Audit Blog) and surfaces Data Health; harden governance with schedules, notifications, and PR gates.

---

## 1) Backlog Ingestion (Raw)

- Control Panel scope, API contracts (trigger/status/health)
- Backend: GitHub API client (Octokit) + secrets (GH_OWNER, GH_REPO, GH_ACTIONS_TOKEN)
- Backend: POST /api/admin/workflows/:name/run (dispatch workflow)
- Backend: GET /api/admin/workflows/:name/status (latest run status/link)
- Backend: GET /api/admin/data-health (read latest seed-audit.json artifact)
- Frontend: New "Control Panel" tab (Workflows + Data Health)
- Frontend: Buttons + last-run badges for Verify RLS, Seed Blog, Audit Blog
- Frontend: Data Health widget (FS/DB counts, drift OK/Not OK)
- Security: gate endpoints behind admin auth + RBAC; CSRF for POST
- Docs: admin guide + configuring GH token secrets
- QA: E2E tests for Control Panel flows and permissions
- CI: Nightly schedule + failure notifications for RLS verification
- CI: Nightly schedule + notifications for seed and audit
- Audit enhancement: checksums/field-level drift and diff in artifact (published-only)
- PR preflight/gates for RLS SQL + REST verification on PRs (env-gated)
- E2E test: anon cannot see drafts via site endpoints (Playwright)
- Dependency/security scanning (npm audit/OSV, CodeQL optional)
- Incident runbook for RLS verification failures/drift (docs)

---

## 2) Organized & Prioritized Backlog (with Estimates)

- High, Small — Nightly schedule + failure notifications for RLS (`.github/workflows/apply-rls.yml`)
- High, Small — Nightly schedules + notifications for seed/audit
- High, Medium — Backend Octokit client + secrets wiring
- High, Medium — POST /api/admin/workflows/:name/run
- High, Medium — GET /api/admin/workflows/:name/status
- High, Medium — Frontend Control Panel tab (Workflows UI with buttons/badges)
- High, Medium — Security hardening (admin auth/RBAC, CSRF)
- High, Medium — GET /api/admin/data-health + Frontend Data Health widget
- Medium, Medium — PR preflight/gates for RLS SQL + REST verify on PR
- Medium, Medium — QA: Playwright E2E for Control Panel + anon/drafts site check
- Medium, Medium — Dependency/security scanning (npm audit/OSV; CodeQL optional)
- Medium, Medium — Audit enhancement: checksums/field-level drift diff
- Low, Small — Docs: Admin guide & GH token setup
- Low, Small — Incident runbook for governance failures/drift

Dependencies:
- API endpoints depend on Octokit + secrets wiring.  
- Frontend depends on API endpoints.  
- Data Health widget depends on GET /data-health.  
- PR gates depend on REST verification workflow.  
- Notifications depend on Slack/alt webhook secret.

---

## 3) Sprint Breakdown

### Sprint 1 — Governance Reliability (3–4 days)
- Nightly schedule + failure notifications for RLS and seed/audit.
- Octokit client + secrets wiring on backend.
- Security baseline for admin routes (auth/RBAC/CSRF).
- Docs: short guide for secrets (GH token scopes).

Acceptance:
- Nightly cron added, failures notify with link to artifacts.  
- Backend can authenticate to GitHub (no client exposure).  
- Admin endpoints protected by auth + CSRF.

### Sprint 2 — Control Panel v1: Workflows (4–5 days)
- POST /api/admin/workflows/:name/run
- GET /api/admin/workflows/:name/status
- Frontend Control Panel: Workflows section (3 buttons + last-run status + GitHub link)
- QA: basic E2E happy path for dispatch + status polling

Acceptance:
- Admin can trigger Verify RLS, Seed, Audit from UI.  
- Status chips reflect latest run within 15–30s cache TTL.  
- E2E happy path green.

### Sprint 3 — Control Panel v2: Data Health & QA (4–6 days)
- GET /api/admin/data-health (latest `seed-audit.json` artifact)
- Frontend Data Health widget (FS/DB counts + Drift OK/NOK)
- QA: E2E for Data Health & permission error paths
- Optional: Logs viewer minimal (tail of run logs)
- Optional: PR preflight/gates (RLS) and dependency/security scanning
- Optional: Audit enhancement (checksums/diff)
- Write incident runbook

Acceptance:
- Data Health reflects latest artifact with clear green/red drift indicator.  
- E2E covers workflows and data-health.  
- Governance runbook available for on-call.

---

## 4) Risks & Mitigations
- Token Security — Mitigation: Server-only PAT, least-privilege scopes, never sent to client.
- API Rate/Flakiness — Mitigation: Short TTL cache for status; retry/backoff for artifacts.
- Artifact Lag — Mitigation: Polling with backoff; show "awaiting artifact" state.
- Permissions/Abuse — Mitigation: RBAC, CSRF on POST, server-side validation of workflow names.

---

## 5) Definition of Done (Epic)
- Control Panel tab provides: Run buttons (3 workflows) + last status + Data Health.  
- Nightly governance checks with actionable notifications.  
- Admin-only endpoints secured and documented.  
- E2E tests for core flows passing.  
- Runbook available for incidents.
