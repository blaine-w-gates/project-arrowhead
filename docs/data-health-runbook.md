# Data Health Incident Runbook

Status: v1.0
Owners: On-call Engineering (Backend + Web)
Related docs: `app.py` Data Health endpoint, `seed-audit.yml`, `seed-blog.yml`, Admin Panel `/ops`

---

## Purpose
When the Admin Panel shows Drift: NOK, the filesystem (FS) content and the database (DB) content are out of sync. This runbook guides you to validate, locate the source signal, interpret the audit artifact, remediate safely, and escalate if needed.

---

## Signals and definitions
- Drift OK: FS and DB counts match and both drift arrays are empty.
- Drift NOK: Counts differ OR at least one drift array is non-empty.
- Badges in the Admin Panel Data Health card:
  - Cached: The payload came from cache within TTL.
  - Stale: The payload came from cache after a fresh fetch failed (fallback-to-cache in backend).
- API fields (`GET /api/admin/data-health`):
  - `counts`: `{ fs, db }`
  - `drift`: `{ only_fs: string[], only_db: string[] }` (backend also maps legacy `onlyA/onlyB`)
  - `drift_ok`: boolean
  - `run`: `{ id, url }` points to the GitHub Actions run that produced the artifact
  - `cached`, `stale`, `fetched_at`, `cache_ttl_seconds`

---

## Step 1 — Validate the signal
1) Open the Admin Panel at `/ops` and check the Data Health card.
2) If you see **Stale** or **Cached** badges:
   - Click **Force Refresh** to call `?noCache=1` and bypass cache.
   - Confirm the status still reads **Drift: NOK** after the forced refresh.
3) If the Data Health endpoint returns an error in the Admin Panel, try directly:
   - `curl -s -H "X-Admin-Key: $ADMIN_API_KEY" "$PY_API_BASE/admin/data-health?noCache=1" | jq`.
   - If you see `stale: true`, the backend served the last known good payload because GitHub fetch failed; continue to Step 2 to inspect runs.

---

## Step 2 — Use “View run” to find the audit artifact
1) Click **View run** on the Data Health card if available. This links to the GitHub Actions run that produced the latest audit artifact.
2) In the run view (Workflow: "Audit Blog Seed"), scroll to **Artifacts** and download the `seed-audit` artifact.
3) If the link is missing or invalid, locate a recent audit run manually:
   - GitHub UI → Actions → **Audit Blog Seed** → select latest successful run.
   - Or via CLI:
     ```bash
     gh run list -w "Audit Blog Seed" -L 5
     # Pick a RUN_ID from the latest successful run
     gh run download <RUN_ID> -n seed-audit -D /tmp/seed-audit-<RUN_ID>
     jq . /tmp/seed-audit-<RUN_ID>/seed-audit.json
     ```

---

## Step 3 — Interpret `seed-audit.json`
Typical shape:
```json
{
  "counts": { "fs": 42, "db": 41 },
  "drift": {
    "only_fs": ["2025-08-26-blog"],
    "only_db": []
  },
  "timestamp": "2025-08-29T12:02:00Z"
}
```
- `only_fs` contains items present in the filesystem (e.g., blog post slugs) but missing in the DB.
- `only_db` contains items present in DB but not in the filesystem.
- `counts.fs` vs `counts.db` should match when healthy.

Common causes:
- Recent content added in FS not yet seeded into DB (seed job didn’t run or failed).
- Content marked as draft or renamed in FS causing mismatched slugs.
- DB connectivity, permissions, or migrations issue causing partial inserts.

---

## Step 4 — Initial triage and remediation
Follow the branches below.

### A) `only_fs` non-empty (FS has items DB is missing)
1) Re-run the seeding workflow (GitHub UI):
   - Actions → **Seed Blog to Postgres** (workflow: `seed-blog.yml`) → **Run workflow** on `main`.
2) Wait for the run to finish. Confirm success.
3) Re-run the audit:
   - Actions → **Audit Blog Seed** (workflow: `seed-audit.yml`) → **Run workflow** on `main`.
4) Refresh the Admin Panel (use **Force Refresh**). If `Drift: OK`, incident resolved.
5) If still NOK, inspect logs for:
   - Failures inserting specific slugs.
   - DB connection errors.
   - Draft status or front matter inconsistencies in FS content.

### B) `only_db` non-empty (DB has items FS is missing)
1) Confirm the FS item was intentionally removed or renamed.
2) If removal is intended, you may need a cleanup process in DB (depending on policy). Otherwise:
   - Restore or correct the FS content to match expected slugs.
3) Re-run **Seed Blog** then **Audit Blog Seed**.
4) Refresh Admin Panel. If `Drift: OK`, resolved.

### C) Counts differ but drift arrays are empty
- Verify the audit JSON carefully; ensure both arrays are truly empty.
- If counts differ without drift detail, re-run both **Seed Blog** and **Audit Blog Seed** to regenerate the artifact.

### D) Admin API errors or stale results
- If the Admin Panel shows **Stale**, the backend served cached payload after GitHub fetch failure.
- Validate connectivity and credentials in the backend environment:
  - `GITHUB_SERVER_TOKEN`, `GITHUB_OWNER`, `GITHUB_REPO` (or `GITHUB_REPOSITORY`)
  - Network egress from server to `api.github.com`
- Retry the admin call with `?noCache=1`.
- If still failing, proceed to escalation.

---

## Step 5 — Escalation procedures
Escalate when ANY of the following hold:
- Re-running **Seed Blog** and **Audit Blog Seed** still yields Drift: NOK.
- The audit artifact cannot be produced or downloaded.
- Admin API returns 5xx or remains **Stale** after retries.

Escalation steps:
1) Open a GitHub issue labeled `incident`, `data-health` with:
   - Links to the relevant **Audit Blog Seed** and **Seed Blog** runs.
   - `seed-audit.json` snippet showing counts and drift arrays.
   - Admin API response excerpt (include `cached`, `stale`, and `fetched_at`).
   - What you attempted (Force Refresh, reruns) and outcomes.
2) Notify the on-call rotation (Backend + Web). Include impact assessment:
   - Is the public site affected? Are missing items visible to users?
3) If DB-related, page the Database owner. If FS/content-related, notify Content/Docs owner.
4) Target to restore Drift: OK within 24 hours. Update the incident issue every 2 hours until resolved.

---

## Appendix A — Useful CLI commands
```bash
# List latest Audit Blog Seed runs
gh run list -w "Audit Blog Seed" -L 5

# Download the seed-audit artifact for a given run
RUN_ID=1234567890
mkdir -p /tmp/seed-audit-$RUN_ID
gh run download $RUN_ID -n seed-audit -D /tmp/seed-audit-$RUN_ID
jq . /tmp/seed-audit-$RUN_ID/seed-audit.json

# Force-refresh the admin API (replace values as needed)
PY_API_BASE=${PY_API_BASE:-"http://localhost:5000/api"}
ADMIN_API_KEY=***
curl -s "${PY_API_BASE}/admin/data-health?noCache=1" \
  -H "X-Admin-Key: ${ADMIN_API_KEY}" | jq
```

---

## Appendix B — Interpreting Admin API flags
- `cached: true` and `stale: false`: served from cache within TTL; data still fresh.
- `cached: true` and `stale: true`: served from cache because fresh fetch failed; validate GitHub Actions availability.
- `cache_ttl_seconds`: check the configured TTL (`DATA_HEALTH_TTL_SECONDS`).

---

## Appendix C — Where things live
- Backend endpoint: `app.py` → `api_admin_data_health()`
- GitHub Workflows:
  - `seed-audit.yml` (Audit Blog Seed)
  - `seed-blog.yml` (Seed Blog to Postgres)
  - `seed-preflight.yml` (TypeScript preflight)
- Admin UI:
  - Hook: `client/src/hooks/useDataHealth.ts`
  - Card: `client/src/components/admin/DataHealthCard.tsx`
  - Page: `client/src/pages/ops/AdminPanel.tsx`
