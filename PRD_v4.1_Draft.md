# Product Requirements Document: Project Arrowhead
- Version: 4.1
- Date: August 20, 2025
- Status: Final - Grounded Baseline
- Previous Version: 4.0

---

## Version 4.1 Changes Summary

This version has been updated to reflect the project's true, as-implemented state based on a code-verified grounding. It corrects previous inaccuracies and provides a definitive baseline.

- Corrected Persistence: The most critical update. The technical sections now correctly state that the application uses in-memory storage, with a PostgreSQL migration planned, superseding the previous claim of a completed database integration.
- Corrected Technical Details: Aligned session management (localStorage), testing frameworks (Jest/Puppeteer + Playwright), and API endpoints with the verified implementation.
- Corrected UI Content: Updated module step titles to match the canonical names from the codebase.
- Added Known Gaps: A new section has been added to transparently track identified inconsistencies between the client and server.

References:
- Schema & routes: `website-integration/ArrowheadSolution/shared/schema.ts`, `server/routes.ts`, `server/storage.ts`
- Client logic: `client/src/hooks/useJourney.ts`, `client/src/hooks/useTaskManager.ts`, `client/src/pages/journey/JourneyStepPage.tsx`
- Content: `client/src/data/journeyContent.json`
- Testing: `playwright.config.ts`, root `package.json`

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
- Persistence (current): In-memory storage (`MemStorage`) with Drizzle types
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

---

## Section 3: Implementation Status

✅ All three modules fully implemented with the verified pattern (auto-save, progress, task creation).  
✅ Task List page implemented with CRUD, drag/drop reorder, and export hub.  
✅ E2E: Playwright tests validate full-project PDF export; root Jest/Puppeteer tests exist for additional flows.

Notes:
- Storage is in-memory for this phase; Drizzle schemas define the contract and types. Migration to PostgreSQL is planned.

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
- Persistence: Keep MemStorage for current phase while schema is defined with Drizzle ORM.
- Testing: Split testing — root (Jest/Puppeteer) and app-level E2E (Playwright) for stability and speed.

---

## Section 8: Known Gaps / Cleanup (tracked)
- Client export route alignment: update to `/api/journey/sessions/:sessionId/export` and/or `/api/journey/export/full/:sessionId`.
- Add `GET /api/tasks/:taskId` on server or remove client `getTask()` method.
- Task identity alignment between frontend numeric `id` and server string `taskId` keys.
- PostgreSQL migration of MemStorage while maintaining `sessionId` semantics.

---

END OF DOCUMENT — PRD v4.1 (Final - Grounded Baseline)
