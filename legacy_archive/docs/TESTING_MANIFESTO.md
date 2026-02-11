# Project Arrowhead Testing Manifesto

## 1. Purpose

This document defines how we test Project Arrowhead as an **Agentic Quality
System** rather than a traditional manual QA pipeline. It is the operating
system for how we design, execute, and debug tests.

Goals:

- Make regressions **improbable**, not just fixable.
- Use AI agents plus Playwright to debug failures **before** asking humans.
- Standardize flows so every PR follows the same high bar.

---

## 2. Agentic Capability: MCP + Playwright

### 2.1. How the Agent Differs from a Human Test Runner

The AI agent (Cascade) is not just running `npx playwright test`:

- It can **read and modify** tests, fixtures, and app code.
- It can use Playwright’s **traces, screenshots, and logs** to reason about
  failures.
- It can run **targeted commands** (single-spec runs, grep, curl) to isolate a
  problem.

This turns Playwright from a passive test runner into an **active debugging
partner**.

### 2.2. Planner vs Healer Patterns

- **Planner**
  - Designs test flows.
  - Chooses where to use UI vs API ("God Mode") interactions.
  - Encodes business rules into fixtures and selectors.

- **Healer**
  - When a test fails, does not immediately increase timeouts.
  - Instead, inspects:
    - DOM structure and selectors.
    - Network calls (e.g., auth signup/login, API seeding).
    - Application logs and screenshots.
  - Adjusts the test to wait on a **causal signal** (e.g., network response,
    localStorage token, or profile API success) rather than arbitrary sleeps.

`auth.fixture.ts` and `api.fixture.ts` embody this: they use
`waitForRequest/Response`, `page.request`, and localStorage inspection to
stabilize flows instead of `waitForTimeout(5000)`.

### 2.3. God Mode: Admin API Seeding

We deliberately use Supabase Admin APIs in fixtures to:

- Create users without email-confirmation races.
- Initialize teams and seed Projects/Objectives/Tasks/RRGT data **directly in
  the database**.

Rules:

- Use **Admin/API seeding** for data preconditions.
- Use **UI interactions** only for flows where UI is the subject under test
  (e.g., RRGT drag-and-drop, Touchbase form, Dial visualization).

This keeps tests fast, deterministic, and focused on value.

---

## 3. The Hydration Gap & React Best Practices

### 3.1. What Is the Hydration Gap?

In React apps, there is often a window where:

- The DOM has been rendered by the server or initial JS bundle.
- But React has **not yet attached event listeners** (hydration is incomplete).

Symptoms in Playwright:

- Element is visible but clicks do nothing.
- `waitForURL` or `click` appears flaky across browsers (e.g., passes in
  Chromium, times out in WebKit).

### 3.2. Our Strategy for React Apps

Patterns we use and recommend:

- Prefer **network-based waits** over DOM assumptions:
  - Use `waitForRequest/Response` around signup/login.
  - Poll for **auth tokens** in localStorage (`sb-*-auth-token`) instead of
    waiting for a URL alone.
- Use `waitForLoadState('networkidle')` after major navigations when the page
  kicks off background requests.
- Use `toHaveURL(/expected-path/)` with generous timeouts **after** a causal
  event (e.g., we just navigated to `/dashboard/projects`).
- When the app shows **skeletons or spinners**, assert on those explicitly
  instead of assuming content is ready immediately.

AuthGate is a direct application of this: it surfaces a loading spinner while
AuthContext is hydrating, preventing the UI from flashing `/signin` during that
window.

---

## 4. The Golden Rule of Debugging: Triangulation Protocol

**Never trust a single signal.** Every failure must be understood through:

1. **Logs**
   - Playwright terminal output (console logs from fixtures and app).
   - Server logs (Express, Supabase admin calls).
2. **Network**
   - Status codes for key calls (e.g., `/auth/v1/signup`, `/api/auth/profile`,
     `/api/teams/:teamId/projects`).
   - Whether responses are JSON vs HTML.
3. **Visuals**
   - Screenshots at failure time.
   - Playwright traces / videos.

### 4.1. Debugging Checklist

When a CI run fails:

1. Open the Playwright HTML report.
2. For the failing test:
   - Inspect **console log output** from fixtures.
   - Inspect **network** panel for 4xx/5xx or HTML where JSON is expected.
   - View the **screenshot** and, if needed, the trace/video.
3. Classify the failure:
   - **Timeout** (likely hydration, selector, or wait condition).
   - **4xx/5xx** (application or API bug).
   - **Data mismatch** (seeded data vs UI expectations).
4. Only after classification decide whether to:
   - Fix app code.
   - Fix fixtures/selectors.
   - Adjust expectations.

---

## 5. Autonomous CI/CD Pre-Flight Protocol

### 5.1. Local Pre-Flight Checklist

Before opening a PR against ArrowheadSolution:

```bash
# From website-integration/ArrowheadSolution
npm install          # if dependencies changed
npm run lint         # ESLint
npm run check        # TypeScript compilation
npm run test:unit    # Vitest unit tests (pass with no tests allowed)
npm run test:e2e     # Playwright E2E (at least core flows green)
```

For targeted debug runs:

```bash
npx playwright test tests/e2e/rrgt-touchbase.spec.ts --project=chromium
```

### 5.2. GitHub PR Automation (via `gh`)

Recommended CLI flow (after commits are ready):

```bash
git checkout -b fix/phase-2.6-api-auth
# ... commits ...

git push -u origin fix/phase-2.6-api-auth

gh pr create \
  --title "Phase 2.6: API HTML Fix & AuthGate Implementation" \
  --body "\
- Mount Team MVP routers under /api to prevent HTML fallthrough.\\n\
- Implement AuthGate for auth gating; keep subscription logic in ProtectedRoute.\\n\
- Unskip RRGT E2E test and verify seeding flow.\n" \
  --fill

# After CI is green
gh pr merge --squash --auto
```

This makes the PR lifecycle reproducible and scriptable for agents.

---

## 6. Testing Pyramid & When to Use God Mode

### 6.1. Layers

1. **Unit Tests (Vitest)**
   - Components, hooks, and pure functions.
2. **API/E2E Hybrid (Playwright + `page.request`)**
   - Seed data using Admin APIs.
   - Assert that REST endpoints respect RLS and business rules.
3. **Full UI E2E**
   - Only where UX flow is the subject (e.g., RRGT interactions, Touchbase
     forms, Dial selection).

### 6.2. Rules

- Use **Supabase Admin + `page.request`** for setup and teardown.
- Avoid UI-based seeding (clicking through many forms) except where the form
  itself is what we’re testing.
- Each test should have **one primary UI intent**; everything else should be
  seeded or stubbed.

---

## 7. Debugging Heuristics for CI Failures

### 7.1. Timeouts

- Check whether the locator is too generic or the DOM hasn’t hydrated.
- Prefer to:
  - Narrow selectors (labels, roles, test IDs).
  - Wait for network responses or tokens rather than arbitrary delays.

### 7.2. 4xx/5xx Responses

- Map failing request to its handler (e.g., `server/api/projects.ts`).
- Verify DB/RLS configuration and request body.
- Add logging in the handler if necessary.

### 7.3. HTML vs JSON

- Immediately suspect **routing** (see `API_ROUTING_PARITY.md`).
- Confirm whether the router is mounted under `/api` and that proxies are
  correctly configured.

### 7.4. Flaky Visual/UI Issues

- Use Playwright trace to see timing and animations.
- Prefer to click on **role/label-based locators** with explicit
  `expect(...).toBeVisible()` before interacting.

---

## 8. Agentic Workflow Commitments

When tests fail, the Agent (Cascade) will:

1. Reproduce the failure locally with a targeted Playwright run.
2. Inspect logs, network, and screenshots (Triangulation Protocol).
3. Propose and, when allowed, implement minimal, causal fixes.
4. Only escalate to the human when:
   - The failure depends on external credentials or infrastructure, or
   - Business intent is ambiguous.

This is how we graduate from “code writer” to **Autonomous Quality Engineer**.
