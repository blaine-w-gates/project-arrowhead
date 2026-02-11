# Testing Audit Report – E2E Suite (Operation Cleanup)

**Date:** 2025-11-21  
**Scope:** `tests/e2e` (including `atomic/` and prod-only specs)

---

## 1. Context & Goal

- Phase 2.6 (PR #160) is merged; E2E infra is stabilized (fixtures, atomic tests, API seeding).
- CI runtime is ~20+ minutes because **legacy, slow, UI-heavy tests** still run alongside the new **atomic/fixture-driven** tests.
- Goal: **reduce PR E2E runtime to <5 minutes** by:
  - Removing or isolating redundant, slow tests.
  - Consolidating overlapping coverage.
  - Keeping a small, high-value, fast suite as the default.

This report is **analysis-only**. No files were deleted or modified as part of this audit.

---

## 2. High-Level Recommendations

- **KEEP (as-is in PR CI):**
  - All **`atomic/`** specs (already fast, fixture-based, and aligned with the new strategy).
  - Small **SEO / blog / robots / sitemap / headers** smoke tests.
  - Core **RRGT / journey hub** coverage.
- **MIGRATE / CONSOLIDATE (then delete originals):**
  - Large, multi-flow specs like **`user-onboarding.spec.ts`** and **`project-lifecycle.spec.ts`**.
  - Multi-file **PDF export** tests with overlapping scenarios.
  - Rich domain tests like **`team-invitations.spec.ts`** that could be partially moved into integration tests + smaller atomic specs.
- **DELETE (safe to remove once agreed):**
  - Pure **debug/diagnostic** specs that no longer provide ongoing value (e.g. `debug-team-members.spec.ts`).
- **Prod-only hardening tests:**
  - Keep but **run in a dedicated, non-PR pipeline** (they are already heavily gated by `prod-chromium` project & env vars; they are not the main 20m bottleneck).

Estimated impact (once changes are applied):

- Removing/migrating the big onboarding + lifecycle specs and consolidating PDF tests should cut **~50–75%** of E2E wall-clock time.
- Pragmatically, expect PR runs to drop from **~20+ min → ~5–8 min**, with room for further tuning.

---

## 3. File-by-File Classification (KEEP / MIGRATE / DELETE)

### 3.1 Atomic Navigation & Layout Tests

**KEEP – these are the new "gold standard" and should remain in PR CI.**

- `tests/e2e/atomic/layout-isolation.spec.ts`
  - **Role:** Ensures dashboard layout is isolated from marketing (no GlobalSidebar / marketing nav inside `/dashboard/*`).
  - **Why KEEP:** Fast, fixture-based via `signUpAndGetTeam`; high signal, low cost.

- `tests/e2e/atomic/refresh-persistence.spec.ts`
  - **Role:** Verifies refresh persistence (reload on `/dashboard/projects` keeps you on dashboard, no reappearing Welcome modal).
  - **Why KEEP:** Directly validates the AuthGate/AuthContext hardening from Phase 2.6; small and focused.

### 3.2 Onboarding & Lifecycle Flows

These are the main **legacy-style, multi-step flows** that drive CI time.

- `tests/e2e/user-onboarding.spec.ts`
  - **Tests:**
    - New user signup + team initialization + dashboard access.
    - Create first project after team init.
    - Trial banner when `daysLeftInTrial <= 3`.
    - Edge cases: cannot init team twice, unauthenticated init blocked.
  - **Current style:** Uses `signUpNewUser` + `initializeTeam` fixtures (fast path via Supabase Admin in CI) but still performs **full-page dashboard flows** for multiple scenarios.
  - **Coverage overlap:**
    - Happy-path onboarding largely overlaps with: `auth.fixture.ts`, `TeamInitializationModal` unit tests, and atomic navigation/refresh tests.
  - **Unique value:**
    - Trial banner behavior and double-init / unauthenticated edge cases.
  - **Classification:** **MIGRATE → then DELETE.**
    - *Migrate:*
      - Move **trial banner** logic into a new atomic spec (e.g. `atomic/trial-banner.spec.ts`) that:
        - Uses `signUpAndGetTeam` for fast setup.
        - `page.route` mocks `/api/auth/profile` exactly as current test.
      - Move **double team init / unauthenticated init** checks into:
        - A small integration test for `/api/auth/initialize-team`, and/or
        - A more direct atomic spec that calls the API via `page.request` without navigating full dashboard flows.
    - *Then delete:* `user-onboarding.spec.ts` after new coverage exists.

- `tests/e2e/project-lifecycle.spec.ts`
  - **Tests:**
    - Create project, fill 5-question vision via UI.
    - Archive & restore projects via menu.
    - Delete protection when project has objectives (business rule).
  - **Current style:** Multiple long UI flows per test; uses `signUpNewUser`/`initializeTeam`, plus `createProjectViaUI`, direct `/api` calls via `page.evaluate`.
  - **Coverage overlap:**
    - Vision behavior is now validated by:
      - `VisionModal` unit test.
      - `projects-api` integration tests (`vision` payload & schema).
    - Archive/restore + delete-protection are **not** currently covered in atomic tests.
  - **Classification:** **MIGRATE → then DELETE.**
    - *Migrate unique logic into new atomic specs:* for example:
      - `atomic/project-archive-delete.spec.ts` using `seedCompleteHierarchy`:
        - Seed project + objective via `api.fixture.ts`.
        - Use minimal UI to toggle archive/restore.
        - Use direct API to attempt delete on non-empty project and assert 400 + proper message.
      - Drop full UI-based vision fill (already covered by unit/integration tests and new VisionModal/unit).
    - Once equivalent atomic tests exist, delete this file.

### 3.3 Team Invitations & Members

- `tests/e2e/team-invitations.spec.ts`
  - **Tests:**
    - Create virtual members and send invites.
    - Permission checks (only owner/manager can invite).
    - Duplicate email prevention.
    - Cannot invite non-virtual members.
    - Cannot re-invite with pending invitation.
  - **Style:** Uses fixtures for auth/team init; uses `page.evaluate` to call invite APIs directly (no UI emailing flows).
  - **Value:** Encodes key **business rules** around team invitations & RLS.
  - **Costs:** Multiple full `signUpNewUser` + `initializeTeam` flows; multiple variations.
  - **Classification:** **MIGRATE (partial) – do NOT delete wholesale.**
    - Proposal:
      - Move the core rules into **server integration tests** (e.g. `tests/integration/team-members-api.test.ts`):
        - Duplicate invite.
        - Non-virtual member invite.
        - Role-based permission.
      - Keep **ONE trimmed E2E** scenario as a smoke test (e.g. "owner can invite virtual member, invite_status=invite_pending").
      - Delete redundant overlapping E2E cases after integration coverage is in place.

- `tests/e2e/debug-team-members.spec.ts`
  - **Role:** Debug-only diagnostic to log `/api/teams/:teamId/members` and assert shape is an array.
  - **Classification:** **DELETE (safe).**
    - This is pure instrumentation and is already superseded by:
      - Actual application usages (PermissionGrid).
      - Integration tests on team-members APIs.

### 3.4 RRGT / Touchbase / Objectives

- `tests/e2e/rrgt-touchbase.spec.ts`
  - **Role:** High-value E2E verifying RRGT item lifecycle using **API seeding** (`seedCompleteHierarchy`), plus (currently skipped) placeholders for touchbase & dial.
  - **Classification:** **KEEP.**
    - Exactly matches the new testing philosophy (fast seeding, minimal but real UI interaction).

- `tests/e2e/objective-lock.spec.ts`
- `tests/e2e/objective-resume.spec.ts`
- `tests/e2e/objectives-pages-functions.prod.spec.ts`
  - **Role:** Agentic verification of Cloudflare Pages Functions behavior in production (lock/resume endpoints, objectives listing/creation).
  - **Gating:** Use `PLAYWRIGHT_PROD_BASE_URL`, credentials, and/or `prod-chromium` project – not part of default dev runs unless explicitly enabled.
  - **Classification:** **KEEP**, but **ensure they run only in a dedicated “prod smoke” job**, not in every PR CI run.

### 3.5 Team MVP Auth & Dashboard

- `tests/e2e/team-mvp.spec.ts`
  - **Role:** Broad smoke coverage for Team MVP flows using static env credentials:
    - UI login with valid/invalid credentials.
    - Project creation via UI.
    - Scoreboard task creation & filters.
  - **Gating:** Skips entirely unless `E2E_TEST_EMAIL` / `E2E_TEST_PASSWORD` are configured.
  - **Classification:** **KEEP (out-of-band).**
    - Treat as **manual / nightly smoke**; it is not the 20m PR bottleneck due to env gating.
    - If PR CI is currently running it in all browsers, consider moving it into a separate `team-mvp` workflow.

### 3.6 Journey Flows

- `tests/e2e/journey-hub.spec.ts`
  - **Role:** Smoke test for `/journey` hub UX: cards, headings, navigation to Brainstorm step 1.
  - **Classification:** **KEEP.**

- `tests/e2e/journey-brainstorm-flow.spec.ts`
- `tests/e2e/journey-objectives-flow.spec.ts`
  - **Role:** End-to-end flows through the multi-step Brainstorm and Objectives journeys.
  - **Costs:** Multi-page flows with many steps and transitions; likely some of the slower tests.
  - **Unique value:** They exercise the full front-end journey UX, which is hard to replicate with pure API tests.
  - **Classification:** **KEEP for now, consider LIGHT REFACTOR later.**
    - Short-term: keep them as part of the high-value UX tests.
    - Longer-term: consider trimming to a **single happy-path per module** (e.g. fewer steps, or partial coverage moved into PDF tests).

### 3.7 PDF Export Tests

Current files:

- `tests/e2e/brainstorm-pdf.spec.ts`
- `tests/e2e/full-project-pdf.spec.ts`
- `tests/e2e/full-project-pdf-cross-session.spec.ts`
- `tests/e2e/full-project-pdf-footer.spec.ts`
- `tests/e2e/full-project-pdf-no-placeholder.spec.ts`
- `tests/e2e/full-project-pdf-visual.spec.ts`

All of these:

- Generate PDFs and use **`pdfjs-dist`** to parse text or render pages.
- Have **very long timeouts (up to 180s)** and heavy CPU usage.
- Provide overlapping assurances: no cross-session leakage, placeholder handling, footer behavior, layout wrapping, etc.

**Recommendation:** **CONSOLIDATE into 1–2 specs, then delete the others.**

- **KEEP / Pivot to primary:**
  - `full-project-pdf.spec.ts`
    - Broadest coverage: tasks table layout, module titles, wrapping behavior, uniqueness constraints.

- **MIGRATE / Consolidate logic from:**
  - `brainstorm-pdf.spec.ts`
  - `full-project-pdf-cross-session.spec.ts`
  - `full-project-pdf-footer.spec.ts`
  - `full-project-pdf-no-placeholder.spec.ts`
  - `full-project-pdf-visual.spec.ts` (already gated by `E2E_VISUAL=1`).

Suggested consolidation plan:

- Extend `full-project-pdf.spec.ts` to include **one** representative assertion each for:
  - Cross-session leakage prevention.
  - Placeholder behavior when some steps are unanswered.
  - Footer/"Page X of Y" expectations.
- Keep `full-project-pdf-visual.spec.ts` as **opt-in only** (visual baseline), not part of PR CI.
- After consolidation, **delete the redundant PDF specs** to avoid multiple heavy runs.

### 3.8 Blog / SEO / Robots / Data Health

These are **fast, high-signal smoke tests** and should be kept.

- `blog-404.spec.ts` – not-found UI for missing slug.
- `blog-head.spec.ts` – HEAD API health & caching metadata.
- `blog-headers.spec.ts` – prod-only blog HEAD headers (nosniff, HSTS, cache-control) via `prod-chromium`.
- `blog-order.spec.ts` – ordering by `publishedAt` desc.
- `blog.spec.ts` – list/detail/XSS sanitization behavior.
- `draft-exclusion.spec.ts` – ensures drafts are excluded from blog list / sitemap / RSS.
- `rss.spec.ts` – RSS exists, has items, excludes XSS post.
- `sitemap.spec.ts` – sitemap exists, contains blog URLs, excludes XSS post.
- `robots.spec.ts` – `/robots.txt` disallows `/admin`.
- `data-health-cached.spec.ts` / `data-health-stale.spec.ts` – admin DataHealth card badges via mocked responses.

**Classification:** **KEEP.**  They are all HTTP-level or small UI checks and do not materially impact CI runtime.

### 3.9 Admin & Lead / OAuth Hardening Tests

- `admin-access.spec.ts` (prod Cloudflare Access tests using service tokens).
- `admin-noindex.spec.ts` / `admin-redirect.spec.ts` / `admin.spec.ts` (basic admin routing + meta noindex checks, mostly skipped in CI when `E2E_SKIP_ADMIN` is set).
- `lead-headers.spec.ts` (prod lead-magnet HEAD/OPTIONS/GET hardening).
- `lead-magnet.spec.ts` (prod lead-magnet API behavior, heavily gated & skipped by default).
- `oauth-headers.spec.ts` (prod OAuth auth/callback HEAD + redirect hardening).

**Classification:** **KEEP**, but **treat as a separate "Production Hardening" suite**:

- They are:
  - Mostly HEAD/OPTIONS or single GET calls.
  - Already gated on `prod-chromium` and/or env vars.
- They should **not run in default PR CI**, but rather in:
  - Nightly pipeline, or
  - Manual/separate workflow focused on security headers & production observability.

### 3.10 Miscellaneous

- `objective-lock.spec.ts`, `objective-resume.spec.ts`, `objectives-pages-functions.prod.spec.ts`, `team-mvp.spec.ts`, `lead-magnet.spec.ts`, `oauth-headers.spec.ts` – all follow the same pattern: prod-only, hardening & smoke tests.
- `journey-hub.spec.ts` – lightweight journey landing smoke; keep.

---

## 4. Proposed Kill List (After Migration / Agreement)

### 4.1 Immediate Safe Delete

These can be removed with **no migration required**:

1. **`tests/e2e/debug-team-members.spec.ts`**
   - Pure diagnostic to log the team-members API; not part of any formal acceptance criteria.
   - Risk of deletion is negligible; real coverage exists in app usage and integration tests.

### 4.2 Delete After Migration / Consolidation

These should be removed **after** the suggested replacements are landed:

1. **`tests/e2e/user-onboarding.spec.ts`**
   - Replace with:
     - `atomic/trial-banner.spec.ts` for trial banner behavior.
     - Integration tests for `/api/auth/initialize-team` (double-init, unauthenticated).
   - Rationale: large UI journeys with flows that are better expressed as short atomic tests.

2. **`tests/e2e/project-lifecycle.spec.ts`**
   - Replace with:
     - New `atomic/project-archive-delete.spec.ts` using `seedCompleteHierarchy`.
     - Existing unit/integration tests for VisionModal + projects API.
   - Rationale: repeated long flows; vision logic already covered elsewhere.

3. **`tests/e2e/team-invitations.spec.ts`** (partial)
   - Keep **one** smoke spec for "owner can invite virtual member".
   - Move the other business-rule checks into integration tests; then drop redundant E2E cases.

4. **PDF spec consolidation:**
   - Delete the following **after** porting key assertions into `full-project-pdf.spec.ts` and keeping `full-project-pdf-visual.spec.ts` as opt-in:
     - `brainstorm-pdf.spec.ts`
     - `full-project-pdf-cross-session.spec.ts`
     - `full-project-pdf-footer.spec.ts`
     - `full-project-pdf-no-placeholder.spec.ts`

5. **(Optional) Journey flow trimming:**
   - If CI time is still high after the above changes, consider simplifying:
     - `journey-brainstorm-flow.spec.ts`
     - `journey-objectives-flow.spec.ts`
   - For now they are marked KEEP, but they are candidates for partial consolidation.

---

## 5. Estimated CI Time Savings

Assumptions (based on typical Playwright behavior and test complexity):

- `user-onboarding.spec.ts` and `project-lifecycle.spec.ts` together account for **~6–10 minutes** across 3 browsers (long flows, multiple tests, networkidle waits).
- The multi-file PDF suite (5 heavy specs) adds another **~4–6 minutes** due to PDF generation + parsing overhead.
- Team invitation & debug specs contribute **1–2 minutes** more.

After applying the plan:

- **Short-term (after deleting debug + consolidating PDFs):**
  - Expected reduction: **~4–6 minutes**.
- **Medium-term (after migrating & deleting `user-onboarding` + `project-lifecycle` + trimming invitations):**
  - Additional reduction: **~6–9 minutes**.

**Net effect:**

- PR E2E suite should drop from roughly **20+ minutes → ~5–8 minutes**, dominated by:
  - `atomic/*` specs,
  - RRGT/touchbase,
  - A handful of SEO/blog/admin smoke tests,
  - A single consolidated PDF test.

---

## 6. Next Steps

1. **Review & Approve This Report**
   - Confirm the classification and kill list align with your risk tolerance.

2. **Implement Migrations:**
   - Add the proposed atomic and integration tests for:
     - Trial banner.
     - Initialize-team edge cases.
     - Archive/restore & delete-protection rules.
     - Team invitation business rules.
     - Consolidated PDF assertions.

3. **Update CI Config:**
   - Ensure prod-only tests (`*prod*.spec.ts`, `team-mvp.spec.ts`, `lead-magnet.spec.ts`, `oauth-headers.spec.ts`, `admin-access.spec.ts`) run only in dedicated jobs, not in every PR.

4. **Delete Redundant Specs (in stages):**
   - Stage 1: Remove `debug-team-members.spec.ts`.
   - Stage 2: Remove redundant PDF specs after consolidation.
   - Stage 3: Remove `user-onboarding.spec.ts`, `project-lifecycle.spec.ts`, and extra invitation flows once new coverage is merged.

This staged approach keeps risk low while aggressively reducing CI time and aligning the suite around fast, fixture-driven, high-value tests.
