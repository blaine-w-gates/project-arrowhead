# API Routing Parity

This document defines the routing contract between:

- The **Express backend** (Team MVP API)
- The **Vite dev server**
- The **production edge (Cloudflare / Pages)**
- The **E2E test harness (Playwright)**

The goal is to prevent regressions like the Phase 2.5 bug where `/api/teams/:teamId/projects`
returned **HTML (index.html)** instead of JSON.

---

## 1. Core Contract

1. **All backend endpoints live under `/api/**`.**
   - Implemented in **Express** routers under `server/api/*.ts`.
   - Mounted in `server/routes.ts` with `app.use('/api', router)`.

2. **Non-API requests fall back to the SPA.**
   - Dev: Vite middleware serves `client/index.html` for non-API paths.
   - Prod: Static host / Cloudflare serves the built SPA; unknown paths
     fall through to `index.html`.

3. **Any response to `/api/**` must be JSON (or a specific API content type),
   never HTML.**
   - If `/api/...` returns `Content-Type: text/html` or contains `<html>`,
     this indicates a **routing misconfiguration** (usually a missing router
     mount or bad proxy).

---

## 2. Express Server Structure

Key files:

- `server/index.ts`
  - Creates the Express app.
  - Calls `registerRoutes(app)`.
  - Creates the HTTP server and, in dev, wires Vite via `setupVite(app, server)`.
- `server/routes.ts`
  - Registers legacy marketing/blog APIs.
  - Mounts Team MVP routers:
    - `./api/auth`
    - `./api/projects`
    - `./api/objectives`
    - `./api/tasks`
    - `./api/rrgt`
    - `./api/touchbases`
    - `./api/team-members`
    - `./api/test` (E2E utilities; non-prod only)
- `server/vite.ts`
  - Dev-only: attaches Vite as middleware in **middlewareMode**.
  - Adds a `"*"` catch-all that serves `client/index.html`.

### 2.1. Route Order (Critical)

In `server/index.ts`:

1. `registerRoutes(app)`
2. `const server = createServer(app)`
3. `if (NODE_ENV === 'development') await setupVite(app, server)`

**Rule:** All `/api/**` routes **must** be registered inside `registerRoutes`
*before* `setupVite` is called.

Reason:

- `setupVite` adds `app.use(vite.middlewares)` and then `app.use('*', ...)` that
  serves the SPA.
- If an API router is not mounted, the request falls through to the Vite
  `"*"` handler and returns `index.html`.

This is exactly what caused the HTML response bug for
`/api/teams/:teamId/projects` in Phase 2.5/2.6.

---

## 3. Dev vs Prod Behavior

### 3.1. Development (Playwright, local dev)

- Command: `npm run dev`
  - Runs `server/index.ts` with `NODE_ENV=development` using `tsx`.
- The Express app listens on `PY_BACKEND_PORT` (from Playwright config),
  typically `5000`.
- Vite runs in **middleware mode** inside the same process.

Routing:

- `GET /api/...` → Express handlers in `server/api/*`.
- `POST /api/...` → Express handlers in `server/api/*`.
- Any other `GET /*` that is not a static asset → Vite `"*"` handler →
  `client/index.html`.

Playwright:

- `webServer` points to `http://localhost:5000`.
- E2E tests call:
  - `page.goto('/...')` for SPA pages.
  - `page.request.get('/api/...')` and `page.request.post('/api/...')` for APIs.

### 3.2. Production (Cloudflare / Pages)

- The SPA bundle is built by Vite (`npm run build`).
- API routes are served by the Node backend (deployed behind Cloudflare).
- Cloudflare / Pages configuration ensures that:
  - `https://app.example.com/api/**` → Node/Express backend.
  - All other routes → static SPA, with `index.html` as fallback.

**Parity Requirement:**

- Any route that is `/api/**` in dev must also be routed to the backend in prod.
- No `/api/**` path should ever be served by the SPA in prod.

---

## 4. Adding New Team MVP APIs Safely

When you add a new Team MVP API endpoint:

1. **Create a router file** under `server/api/`.
   - Example: `server/api/notifications.ts`.
   - Export a default Express `Router`.

2. **Mount the router in `server/routes.ts`:**

   ```ts
   const notificationsRouter = await import('./api/notifications');
   app.use('/api', notificationsRouter.default);
   ```

3. **Add a basic E2E/API sanity test:**
   - Use `page.request.get('/api/your-endpoint')` or
     `page.request.post(...)`.
   - Assert `response.ok()` and that the body is valid JSON.

4. **Run local verification:**

   ```bash
   npm run dev
   curl -i http://localhost:5000/api/your-endpoint
   ```

   - Confirm status is not 404 and `Content-Type` is `application/json`.

---

## 5. Detecting HTML/JSON Routing Regressions

If an E2E test throws an error like:

> Invalid JSON response: `<html>...` or expects JSON but receives HTML

follow this checklist:

1. **Check the URL:**
   - Is it under `/api/**`? If not, correct the client.

2. **Check Express mounts:**
   - Open `server/routes.ts`.
   - Verify the corresponding router is imported and mounted with
     `app.use('/api', router.default)`.

3. **Check route path:**
   - Ensure the router uses the correct path prefix.
   - Example for `projects`:
     - Router defines `router.post('/teams/:teamId/projects', ...)`.
     - Mounted at `/api` → final route is `/api/teams/:teamId/projects`.

4. **Check Vite / Cloudflare configuration:**
   - Make sure `/api/**` is *not* intercepted by a static asset rule.

5. **Re-run a minimal reproduction:**

   ```bash
   curl -i http://localhost:5000/api/teams/{teamId}/projects
   ```

   - If you see HTML, the request is hitting the SPA fallback instead of
     Express.

---

## 6. Lessons from Phase 2.6

- The `/api/teams/:teamId/projects` bug was not in the controller logic; it was
  caused by **forgetting to mount** the `projects` router under `/api`.
- Vite’s `"*"` handler happily served `index.html`, so the response looked
  superficially "successful" (HTTP 200) but was **semantically wrong**.
- The fix was purely routing-level:
  - Import and mount all Team MVP routers in `server/routes.ts` under `/api`.
- E2E tests that seed data via `/api` are now our **early warning system**
  against this entire class of routing regressions.
