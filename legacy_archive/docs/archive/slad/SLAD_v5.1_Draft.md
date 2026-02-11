---
**STATUS: SUPERSEDED - HISTORICAL ARCHIVE**  
This document is preserved for historical reference only.  
**Current version:** SLAD_v5.2_Final.md  
**Archived:** October 23, 2025  
---

# Software Level Architecture Document (SLAD) v5.1 — Draft

Project: Project Arrowhead — ArrowheadSolution grounding

Date: Aug 20, 2025


## 1) Architecture & Paths
- Monorepo app location: `website-integration/ArrowheadSolution/`
- Client: `client/` (React 18 + TypeScript + Vite)
- Server: `server/` (Express)
- Shared: `shared/` (Drizzle ORM schema + Zod)
- Path aliases (`tsconfig.json`):
  - `@/*` → `client/src/*`
  - `@shared/*` → `shared/*`


## 2) Server Configuration
- Entry: `server/index.ts`
- Host/Port: listens on `localhost` and `process.env.PORT || 5000`
- API base prefix: `/api` (see `server/routes.ts`)
- Dev vs Prod:
  - Dev: Vite middleware (via `setupVite`) after routes for catch-all safety
  - Prod: static serving via `serveStatic`
- Request logging: captures and truncates JSON responses for `/api/*` routes

Environment variables:
```bash
PORT=5000                 # default if not specified (only open port)
PLAYWRIGHT_BASE_URL=...   # optional; overrides baseURL for e2e tests
```


## 3) Data Model (Drizzle ORM) — `shared/schema.ts`
- No UUIDs currently. All primary keys are serial integers.
- `sessionId` is a text string, used across tables to identify guest/user session context.

Tables:
- `users`
  - `id serial PK`, `email unique text`, `password text`, `tier text default 'free'`, `createdAt timestamp`
- `blog_posts`
  - `id serial PK`, `title text`, `slug unique text`, `excerpt text`, `content text`, `imageUrl text?`, `published boolean default false`, `publishedAt timestamp?`, `createdAt timestamp`
- `email_subscribers`
  - `id serial PK`, `email unique text`, `subscribed boolean default true`, `createdAt timestamp`
- `journey_sessions`
  - `id serial PK`, `userId integer?`, `sessionId text unique`, `module text` ('brainstorm' | 'choose' | 'objectives')
  - `stepData text` (JSON string; default '{}'), `completedSteps text` (JSON array string; default '[]')
  - `currentStep integer default 1`, `isCompleted boolean`, `completedAt timestamp?`, `createdAt`, `updatedAt`
- `tasks`
  - `id serial PK`, `userId integer?`, `sessionId text`, `title text`, `description text?`
  - `status text default 'todo'`, `priority text default 'medium'`, `dueDate timestamp?`, `assignedTo text default 'You'`
  - `sourceModule text?`, `sourceStep integer?`, `tags text default '[]'`
  - `createdAt`, `updatedAt`

Note: Persistence layer is currently in-memory (`server/storage.ts`) using Maps keyed by `sessionId` for sessions and a generated string key for tasks; Drizzle is used for types and Zod schemas.


## 4) Session ID Handling
- Frontend hook: `client/src/hooks/useJourney.ts`
- Generation: on first load, sets `localStorage['journey_session_id'] = 'guest_' + Date.now() + '_' + random9`.
- LocalStorage keys per-step: `journey_<sessionId>_<module>_step_<n>`
- Frontend and backend exchange `sessionId` strictly as a string (not a UUID).


## 5) API Endpoints — `server/routes.ts`
Blog
- GET `/api/blog/posts`
- GET `/api/blog/posts/:slug`

Users
- POST `/api/users/register`

Email
- POST `/api/email/subscribe`

Journey Sessions
- POST `/api/journey/sessions`
- GET `/api/journey/sessions/:sessionId`
- PUT `/api/journey/sessions/:sessionId`
- GET `/api/journey/sessions?sessionId=<id>` (all sessions for a given `sessionId`)
- GET `/api/journey/sessions/:sessionId/export` (single-module export)
- GET `/api/journey/export/full/:sessionId` (full project export)
- GET `/api/journey/progress/:sessionId`

Tasks
- POST `/api/tasks`
- GET `/api/tasks?sessionId=<id>`
- GET `/api/tasks/session/:sessionId`
- PUT `/api/tasks/:taskId`
- DELETE `/api/tasks/:taskId`


## 6) Client Service — `client/src/services/journeyApi.ts`
- Base URL: `/api`
- Uses string `sessionId` throughout
- stepData/completedSteps sent as JSON strings (matching schema)

Known mismatches to align (see §8):
- `exportJourneyData()` currently targets `/api/journey/export/:sessionId`; server exposes `/api/journey/sessions/:sessionId/export` and `/api/journey/export/full/:sessionId`.
- `getTask(taskId)` calls `GET /api/tasks/:taskId`, but server has no such GET route (only PUT/DELETE by `:taskId`).
- Task update/delete in hooks compare by numeric `task.id` while server identifies tasks by string key in storage; replacement logic won’t match.


## 7) Testing Setup
Root (Jest + Puppeteer)
- Location: project root `package.json`
- Script: `npm test`

ArrowheadSolution (Playwright E2E)
- Location: `website-integration/ArrowheadSolution/`
- Scripts (`package.json`):
  - `npm run test:install` — installs browsers
  - `npm run test:e2e` — run E2E
  - `npm run test:e2e:headed` — headed mode (Chromium)
- Config: `playwright.config.ts`
  - `baseURL`: `http://localhost:5000` (or `PLAYWRIGHT_BASE_URL`)
  - `webServer`: `npm run dev` (starts Express + Vite; timeout 120s)


## 8) Known Gaps / Cleanup (to be tracked)
- Align client export route with server:
  - Option A (single-module): use `/api/journey/sessions/:sessionId/export`
  - Option B (full project): use `/api/journey/export/full/:sessionId`
- Add missing server route `GET /api/tasks/:taskId` or remove client `getTask()`.
- Unify task identity: either expose string `taskId` on Task DTO or switch storage map to key by numeric `id` to match frontend replacement logic.
- Long-term: migrate MemStorage to PostgreSQL via Drizzle ORM, preserving `sessionId` string semantics or revisiting with UUIDs as needed.


## 9) Decision Notes (Schema & IDs)
- Current implementation: serial integer PKs; `sessionId` is a string text field (guest/user session context) — no UUIDs used.
- UUID adoption is not required for SLAD v5.1; if desired later, introduce `uuid` columns with Drizzle migrations and maintain a text `sessionId` for guest continuity or migrate storage contract.


## 10) How to Run
- Dev server (in ArrowheadSolution): `npm run dev` (PORT defaults to 5000)
- E2E (first time): `npm run test:install` → then `npm run test:e2e`
- Unit/integration (root): from project root, `npm test`


---
This draft reflects the current codebase exactly (paths, schema, server, routes, and tests). Pending cleanup items are enumerated without altering behavior for v5.1.
