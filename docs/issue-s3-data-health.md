# Sprint 3: React Admin pivot + Data Health API (Tracking Issue)

Status: In Progress
Owner: Pro (Cascade)
Branch: feature/sprint3-data-health-ops
Scope:
- s3-1 Backend: GET /api/admin/data-health (admin auth, 60s cache, artifact parse)
- s3-2 Frontend: React SPA /ops route with AdminKeyForm + DataHealthCard (React Query)
- s3-3 QA: Backend unit/integration; Frontend unit/component; E2E
- s3-4 Docs: Incident runbook for drift
- s3-8 Bridge: CORS allowlist + API base

Approvals (Architects):
- SPA route path: /ops
- CORS allowlist (prod + previews)
- Data Health JSON contract

Checklist:
- [x] Extend GitHubClient: list_artifacts, download_artifact_zip
- [x] Implement Flask /api/admin/data-health with CORS and TTL cache
- [x] Scaffold React /ops route, AdminKeyForm, DataHealthCard, service/hook/types
- [ ] Backend tests for success, 404, 403, caching
- [ ] Frontend tests (unit/component) and E2E path
- [ ] Docs: runbook draft

Notes:
- Admin header: X-Admin-Key
- Dev: Vite proxy /api -> Flask :5000
- Env: VITE_ADMIN_API_BASE=/api in .env
