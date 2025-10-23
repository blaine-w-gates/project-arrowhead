---
**STATUS: SUPERSEDED - HISTORICAL ARCHIVE**  
This document is preserved for historical reference only.  
**Current version:** PRD_v4.2_Draft.md (will become PRD_v5.0)  
**Archived:** October 23, 2025  
---

# Product Requirements Document: Project Arrowhead
- Version: 4.1
- Date: August 20, 2025
- Status: Final - Grounded Baseline
- Previous Version: 4.0

---

## Version 4.1 Changes Summary

This version has been updated to reflect the project's true, as-implemented state based on a code-verified grounding. It corrects previous inaccuracies and provides a definitive baseline.

- Persistence Baseline: The technical sections now correctly state that PostgreSQL (Supabase) is the primary persistence layer in production, with `PostgresStorage` selected when `DATABASE_URL` is set; `MemStorage`/`HybridStorage` remain as local development fallbacks only.
- Corrected Technical Details: Aligned session management (localStorage), testing frameworks (Jest/Puppeteer + Playwright), and API endpoints with the verified implementation.
- Corrected UI Content: Updated module step titles to match the canonical names from the codebase.
- Added Known Gaps: A new section has been added to transparently track identified inconsistencies between the client and server.
- Grounded PRD v4.1 with exact Cloudflare Functions behavior, global security headers, SEO endpoints, and note duplicate endpoints as known gaps.

References:
- Schema & routes: `website-integration/ArrowheadSolution/shared/schema.ts`, `website-integration/ArrowheadSolution/server/routes.ts`, `website-integration/ArrowheadSolution/server/storage.ts`
- Cloudflare Functions: `website-integration/ArrowheadSolution/functions/api/blog/posts.ts`, `website-integration/ArrowheadSolution/functions/api/blog/posts/[slug].ts`, `website-integration/ArrowheadSolution/functions/api/lead-magnet.ts`
- Global headers: `website-integration/ArrowheadSolution/public/_headers`
- Client logic: `website-integration/ArrowheadSolution/client/src/hooks/useJourney.ts`, `website-integration/ArrowheadSolution/client/src/hooks/useTaskManager.ts`, `website-integration/ArrowheadSolution/client/src/pages/journey/JourneyStepPage.tsx`
- Content: `website-integration/ArrowheadSolution/client/src/data/journeyContent.json`
- Testing: `website-integration/ArrowheadSolution/playwright.config.ts`, root `package.json`

---

## Section 1: Project Blueprint (The "What")

### 1.1. Core Philosophy & Vision
Project Arrowhead is a thinking tool built on the HSE framework (Headlights, Steering Wheel, Engine) to close alignment gaps in teams.

### 1.2. User Experience (UX) Flow
1. Homepage → Journey Dashboard
2. Modules: Brainstorm → Choose → Objectives → Dashboard
3. Guided multi-step wizards (17 total steps)
4. Task List available at any time for task management and exports

### 1.3. Module Specifications (Canonical Step Titles)

- Brainstorm (5 steps)
  1) Imitate / Trends
  2) Ideate
  3) Ignore
  4) Integrate
  5) Interfere

- Choose (5 steps)
  1) Scenarios
  2) Similarities/Differences
  3) Criteria
  4) Evaluation
  5) Decision

- Objectives (7 steps)
  1) Objective
  2) Delegation Steps
  3) Business Services
  4) Skills
  5) Tools
  6) Contacts
  7) Cooperation

- Task List Page
  - Central hub for managing tasks
  - Export hub for task list and full project

### 1.4. Unified Export Strategy (as implemented)
- Each module supports export (PDF via UI; JSON via server endpoint for sessions)
- Task List page:
  - Copy Task List as Markdown
  - Copy Task List as CSV
  - Download Task List as JSON
  - Download Full Project as PDF (includes module answers + task list)

---

## Section 2: Technical Architecture & Implementation (Grounded)

### 2.1. Technology Stack
- Frontend: React 18, TypeScript, Vite, Wouter, TailwindCSS
- Backend: Node.js, Express, TypeScript
- Shared: Drizzle ORM schema definitions + Zod validation
- Persistence: PostgreSQL (`PostgresStorage`) in production; `MemStorage`/`HybridStorage` as fallback for local development when `DATABASE_URL` is not provided
- Testing:
  - Root: Jest + Puppeteer
  - ArrowheadSolution: Playwright E2E (Chromium), webServer `npm run dev`, baseURL `http://localhost:5000`

### 2.2. Structure & Data Flow
- Monorepo: `client/`, `server/`, `shared/`
- SPA communicates with Express API under `/api`
- Path aliases: `@/*` → `client/src/*`, `@shared/*` → `shared/*`

### 2.3. Session Management
- `sessionId` generation and storage: localStorage key `journey_session_id`, format `guest_<timestamp>_<random>`
- `sessionId` is a string field used across journey sessions and tasks
- Per-step localStorage keys: `journey_<sessionId>_<module>_step_<n>`

### 2.4. Data Model (key points)
- Primary keys: serial integers for all tables (no UUID usage)
- `sessionId`: text (unique in `journey_sessions`, referenced by `tasks`)
- `stepData` and `completedSteps`: JSON strings

### 2.5. API Surface (selected)
- Blog: `GET /api/blog/posts`, `GET /api/blog/posts/:slug`
- Users: `POST /api/users/register`
- Email: `POST /api/email/subscribe`
- Journey Sessions: `POST /api/journey/sessions`, `GET/PUT /api/journey/sessions/:sessionId`, `GET /api/journey/sessions?sessionId=...`
- Export (JSON): `GET /api/journey/sessions/:sessionId/export`, `GET /api/journey/export/full/:sessionId`
- Progress: `GET /api/journey/progress/:sessionId`
- Tasks: `POST /api/tasks`, `GET /api/tasks?sessionId=...`, `GET /api/tasks/session/:sessionId`, `PUT /api/tasks/:taskId`, `DELETE /api/tasks/:taskId`

### 2.6. Development & Deployment
- Dev: `npm run dev` (Express + Vite middleware; default port 5000)
- Playwright webServer uses same command; baseURL configurable via `PLAYWRIGHT_BASE_URL`

### 2.7. Cloudflare Pages Functions (API)
- Blog API (functions under `website-integration/ArrowheadSolution/functions/api/blog/`):
  - `GET /api/blog/posts` and `GET /api/blog/posts/:slug`
  - `HEAD` supported on both routes (204)
  - Serves prebuilt JSON assets; adds security headers (`X-Content-Type-Options: nosniff`) and caching headers; JSON error responses for 404/500
- Lead Magnet API (`website-integration/ArrowheadSolution/functions/api/lead-magnet.ts`):
  - `POST /api/lead-magnet` with strict CORS allowlist (`PUBLIC_SITE_URL`, `ALLOWED_ORIGINS`), enforces `Content-Type: application/json` (415), max payload ~2KB (413), email validation (400)
  - Optional Cloudflare Turnstile verification enforced when configured (rejects missing/invalid token)
  - Idempotent insert semantics (duplicates ignored); success response `{ "success": true }`
  - Handles `OPTIONS` (CORS preflight) and returns JSON with `Cache-Control: no-store` and `X-Content-Type-Options: nosniff`

### 2.8. Security Headers (Cloudflare Pages)
- Global headers defined at `website-integration/ArrowheadSolution/public/_headers`:
  - For all paths `/*`: `X-Content-Type-Options: nosniff`; `Referrer-Policy: strict-origin-when-cross-origin`; `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=()`; `X-Frame-Options: DENY`; `Strict-Transport-Security: max-age=31536000; includeSubDomains`; `X-Robots-Tag: all`
  - For admin `/admin/*`: `X-Robots-Tag: noindex, nofollow, noarchive`; `Cache-Control: no-store`; `X-Frame-Options: SAMEORIGIN`; strict `Content-Security-Policy` (default-src 'self' https://unpkg.com; frame-ancestors 'self'; object-src 'none'; form-action 'self' https://github.com; connect-src 'self' https://api.github.com; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; font-src 'self' data:; script-src 'self' 'unsafe-inline' https://unpkg.com; frame-src 'self' https://github.com; upgrade-insecure-requests; block-all-mixed-content)
- API functions also set response-level hardening:
  - Blog: adds `X-Content-Type-Options: nosniff` on GET/HEAD and error paths
  - Lead Magnet: JSON responses include `Cache-Control: no-store` and `X-Content-Type-Options: nosniff`

### 2.9. SEO Endpoints
- `sitemap.xml` and `rss.xml` are generated during build into `website-integration/ArrowheadSolution/client/public/` so Vite includes them in the final site output (`dist/public`)
- Express dev server also exposes SEO routes in `server/routes.ts` for local development

### 2.10. CI/CD Workflows (GitHub Actions)
- Seed Blog to Postgres (`.github/workflows/seed-blog.yml`):
  - Triggers: manual dispatch; on push to `main` affecting `content/blog/**`; nightly at 02:00 UTC
  - Steps: checkout; Node 20; `npm ci`; preflight `npx tsx --version`; verify env; resolve IPv4 (`PGHOSTADDR`); run `npx tsx scripts/seed-blog.mts`; immediate drift check `npm run db:seed:audit`; upload artifacts; notification: auto-create GitHub Issue on failure (standard; adoption pending in this job)
- Audit Blog Seed (`.github/workflows/seed-audit.yml`):
  - Triggers: manual dispatch; nightly at 02:17 UTC
  - Steps: checkout; Node 20; `npm ci`; run `npm run db:seed:audit` (continue-on-error); upload artifact; add job summary; auto-create GitHub Issue labeled `seed-drift` on drift (implemented)
- Seed Workflow Preflight (`.github/workflows/seed-preflight.yml`):
  - Triggers: on push/PR touching workflow or `ArrowheadSolution/**`
  - Steps: `npx tsx --version`; `npm run check`; `npm run validate:blog`
- Manage & Verify RLS Policies (`.github/workflows/apply-rls.yml`):
  - Triggers: on push to `drizzle/migrations/0001_blog_posts_rls.sql`; nightly at 09:00 UTC
  - Steps: secrets preflight; run `node scripts/verify-rls-rest.mjs`; upload artifacts and job summary; notification: auto-create GitHub Issue on failure (standard; adoption pending in this job)

### 2.12. API Strategy
- Primary production API surface: Cloudflare Pages Functions for new and critical features (e.g., Blog, Lead Magnet, OAuth).
- Express server (`server/routes.ts`) continues to serve core in-app module flows and local development endpoints.
- Duplicated endpoints (e.g., Blog in Express vs Functions) will be consolidated toward the Functions surface for production.

### 2.11. Environment Variables (selected)
 - Database/REST: `DATABASE_URL` (Postgres direct), `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`
 - Lead Magnet/CORS: `PUBLIC_SITE_URL`, `ALLOWED_ORIGINS`, `SUPABASE_LEADS_TABLE` (default `leads`)
 - Turnstile (optional): `TURNSTILE_SECRET_KEY`, `TURNSTILE_REQUIRED`
 - CI/CD notifications: GitHub Issues (standard); `SLACK_WEBHOOK_URL` (legacy optional)
 - Testing: `PLAYWRIGHT_BASE_URL`, `PLAYWRIGHT_NO_WEBSERVER`, `E2E_SKIP_LEAD_POSTS`

---

## Section 3: Implementation Status

✅ All three modules fully implemented with the verified pattern (auto-save, progress, task creation).  
✅ Task List page implemented with CRUD, drag/drop reorder, and export hub.  
✅ E2E: Playwright tests validate full-project PDF export; root Jest/Puppeteer tests exist for additional flows.

Notes:
- Production persistence is PostgreSQL (`PostgresStorage`) with nightly seed/audit workflows; `MemStorage`/`HybridStorage` are used only as local development fallbacks when `DATABASE_URL` is unset.

---

## Section 4: User Interface & Experience
- GlobalSidebar navigation with module entry points
- JourneyStep UX with debounced save and clear progress indicators
- Task List empty state: "No tasks yet. Click \"Add Task\" to get started!"

---

## Section 5: Export Specifications

### 5.1. Task List
- Copy as Markdown, Copy as CSV, Download JSON (client-side)
- PDF: Full Project export assembles step answers + tasks

### 5.2. Module Exports
- UI: PDF per module from Task List export hub
- API JSON: `/api/journey/sessions/:sessionId/export` (single module), `/api/journey/export/full/:sessionId` (full project)

---

## Section 6: Testing Strategy
- Root: `npm test` (Jest + Puppeteer)
- ArrowheadSolution: `npm run test:install`, `npm run test:e2e`, `npm run test:e2e:headed` (Playwright)
- Playwright config: `playwright.config.ts` (parallel Chromium, trace/video on failure, baseURL 5000)

---

## Section 7: Key Decisions & Rationale (Updates)
- Session IDs: Use string `sessionId` generated client-side (localStorage) for guest workflows; no UUIDs in current schema.
- Persistence: Production uses PostgreSQL (`PostgresStorage`); `MemStorage`/`HybridStorage` are reserved for local development when `DATABASE_URL` is unset.
- Testing: Split testing — root (Jest/Puppeteer) and app-level E2E (Playwright) for stability and speed.

---

## Section 8: Known Gaps / Cleanup (tracked)
- Client export route alignment: update to `/api/journey/sessions/:sessionId/export` and/or `/api/journey/export/full/:sessionId`.
- Add `GET /api/tasks/:taskId` on server or remove client `getTask()` method.
- Task identity alignment between frontend numeric `id` and server string `taskId` keys.
- Decommission legacy `MemStorage` and `FileBlogStorage` code paths (production uses `PostgresStorage`); retain only minimal local-dev fallback as needed.

- Duplicate blog endpoints: blog APIs are implemented in both Express (`server/routes.ts`) and Cloudflare Functions (`functions/api/blog/*`); consolidate to one source in production
- Header consistency: align Express API response headers (e.g., `X-Content-Type-Options`) with Cloudflare Pages functions and `_headers` for parity

---

END OF DOCUMENT — PRD v4.1 (Final - Grounded Baseline)
