# Sprint 1 Design Note — Governance Reliability

Version: 1.0  
Date: 2025-08-30

Related documents:
- OS v1.0 (primary onboarding): `docs/Project_Arrowhead_OS_v1.md`
- Phoenix Protocol Charter v7.3: `Phoenix_Protocol_Charter_v7.3_Final.md`
- Sprint Plan v4.1: `Sprint_Plan_v4.1.md`
- SLAD v5.2 Final: `SLAD_v5.2_Final.md`

---

## 1) Scope and Acceptance (from Sprint_Plan_v4.1)
- Nightly governance schedules run automatically; failures create a GitHub Issue with links to the run and artifacts.
- Backend can authenticate to GitHub (server-only token; no client exposure).
- Admin endpoints are protected by authentication, RBAC, and CSRF (for POST).

We track each acceptance criterion as a GitHub Issue. Link the created Issue IDs here:
- [ ] Nightly schedule + failure Issues: apply-rls.yml — Issue: TBA
- [ ] Nightly schedule + failure Issues: seed-blog.yml — Issue: TBA
- [ ] Nightly schedule + failure Issues: seed-audit.yml — Issue: TBA
- [ ] Backend Octokit client + secrets wiring — Issue: TBA
- [ ] Admin route protections (auth/RBAC/CSRF) — Issue: TBA

---

## 2) Interfaces (Admin API)
- POST `/api/admin/workflows/:name/run`
  - Body: none (name is path param)
  - Behavior: dispatch a whitelisted workflow by name.
  - Security: Auth required, RBAC: admin only, CSRF required.
- GET `/api/admin/workflows/:name/status`
  - Returns latest known status for a whitelisted workflow.
  - May return cached value (TTL below).
- GET `/api/admin/data-health` (preview; Sprint 3)
  - Returns summary (FS/DB counts + drift) from latest audit artifact when present.

Whitelist for `:name` (server-side validation):
- `verify-rls` → `.github/workflows/apply-rls.yml`
- `seed-blog` → `.github/workflows/seed-blog.yml`
- `audit-blog` → `.github/workflows/seed-audit.yml`

---

## 3) Workflow Governance
Target files:
- `.github/workflows/apply-rls.yml`
- `.github/workflows/seed-blog.yml`
- `.github/workflows/seed-audit.yml`

Standards:
- Add nightly schedule: `cron: '0 2 * * *'` (UTC)
- Add failure notification step using `actions/github-script` with `if: failure()`
  - Required permissions: `issues: write`, `contents: read`, `actions: read`
  - Create an Issue with title `[Auto] Workflow failure: <name>`
  - Body includes run URL `${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}` and notable artifact pointers
- Ensure each job produces clear job summaries and artifacts
  - Examples: `seed-report.json`, `seed-audit.json`

---

## 4) Security Model
- Authentication: server-only, session or header-based; no secrets to client.
- RBAC: admin role required for all admin routes.
- CSRF: enforced on POST (`/workflows/:name/run`).
- Workflow name whitelist: default-deny behavior; no arbitrary dispatch.
- Secrets:
  - Supabase: `SUPABASE_SERVICE_ROLE_KEY` (server-only)
  - GitHub token for backend dispatch/status: server-only env (exact variable name TBD; PAT or GitHub App token)

---

## 5) Caching, Retries, and Timeouts
- Status cache TTL: 15–30 seconds for `GET /status` (reduce API rate pressure)
- Retry/backoff policy: up to 3 attempts with exponential backoff + jitter for transient GitHub API failures
- Timeouts: conservative per-request timeouts on server-side GitHub calls (e.g., 10s)

---

## 6) Observability and Operator States
- Job summary: every workflow writes a succinct summary (success/failure, artifact links)
- Artifacts: predictable names and locations (see standards above)
- Operator states:
  - OK (green)
  - NOK / drift (red)
  - Awaiting artifact (gray)
  - Failed (red, with Issue link)

---

## 7) Error Taxonomy
- Auth errors: 401/403
- Input validation (non-whitelisted name): 400
- Upstream rate/timeout: 429/504 semantics
- Missing artifact: 202 Accepted with `state: "awaiting_artifact"`
- Unexpected: 500 with correlation ID (log-only stack)

---

## 8) Testing Strategy (Sprint 1 minimum)
- Playwright E2E
  - Happy path: admin dispatch → status polling shows update
  - Negative: unauthorized user blocked from admin endpoints
  - Awaiting artifact: UI indicates transient state gracefully
- Integration/unit
  - Whitelist validation logic
  - CSRF on POST, RBAC guard
  - GitHub client wrapper: success, rate limit, timeout, error propagation

---

## 9) Dependencies and Configuration
- Node/Express app under `website-integration/ArrowheadSolution/`
- New modules to add:
  - `server/githubApi.ts` — Octokit wrapper (server-only token)
  - `server/adminRoutes.ts` — routes + security middleware
- Environment
  - Supabase: `SUPABASE_SERVICE_ROLE_KEY` (server-only)
  - GitHub token: server-only env (name TBD)

---

## 10) Open Questions (to resolve in Issues/PRs)
- Backend GitHub token source: PAT vs GitHub App credentials?
- Status derivation: map GitHub run conclusions to simplified states consistently.
- Artifact discovery: standardize artifact names and query strategy.

---

## 11) Rollout Plan
- Phase 1: Add schedules + failure Issues to workflows; manual dispatch smoke tests
- Phase 2: Backend routes + security; E2E happy-path and negative tests
- Phase 3: Data Health read path + UI (Sprint 3, separate)
