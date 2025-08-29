# System Logic & Architecture Document (SLAD)

- Version: 5.2
- Date: August 29, 2025
- Status: Final – Current As‑Built

This document captures the current, code‑grounded architecture for Project Arrowhead. It reflects the migration to PostgreSQL via Drizzle ORM, the dual API strategy (Cloudflare Functions for production; Express for core/local), the automated CI/CD workflows, security hardening, and testing.

---

## 1.0 Document Purpose

Define the authoritative, as‑built technical baseline for Project Arrowhead, with citations to code, scripts, and tests in this repository.

---

## 2.0 Core Architectural Principles

- **Logic/UI separation**
  Business logic (API, validation, storage) is separated from React rendering.

- **Single responsibility**
  Modules and functions do one task well.

- **Decoupled verification**
  E2E tests can run against local dev or production independently.

- **Sequential journey flow**
  Brainstorm → Choose → Objectives flows preserved across modules.

---

## 3.0 High‑Level Architecture

- **Frontend**
  React 18 + TypeScript + Vite; Tailwind + component library in `client/`. Path aliases via `tsconfig.json` (`@/*`, `@shared/*`).

- **Backend (core/local)**
  Express server in `website-integration/ArrowheadSolution/server/` with routes in `server/routes.ts` and storage selection in `server/storage.ts`.

- **Production APIs**
  Cloudflare Pages Functions serve production endpoints (blog, OAuth, lead magnet). Production E2E tests validate these endpoints and headers; Express remains the core/local server.
  The blog seeding pipeline (seed-blog.yml) upserts repository blog content into PostgreSQL for structured access, while production Cloudflare Functions serve pre-built JSON assets generated from the same repository content during the build for maximum performance and reliability—keeping parity with the database.

- **Persistence**
  PostgreSQL via Drizzle ORM when `DATABASE_URL` is present. Fallback to hybrid in local dev: blog reads from filesystem, everything else in memory (`server/storage.ts`).

---

## 4.0 File Structure Manifest (Key)

- `website-integration/ArrowheadSolution/client/`
  SPA, components, and public assets (including `client/public/data/blog/*` generated for Functions).

- `website-integration/ArrowheadSolution/server/`
  Express entry (`index.ts`), routes (`routes.ts`), storage (`storage.ts`, `postgresStorage.ts`), DB (`db.ts`).

- `website-integration/ArrowheadSolution/shared/schema.ts`
  Drizzle ORM schema + drizzle‑zod validation schemas.

- `website-integration/ArrowheadSolution/scripts/`
  Automation: blog seed/validate/SEO, RLS verify/apply, Cloudflare Access policy management.

- `website-integration/ArrowheadSolution/public/_headers`
  Security headers for Pages deploys (site‑wide and `/admin/*`).

- `.github/workflows/*.yml`
  CI/CD pipelines (seed, audit, RLS) with GitHub Issues notifications.

---

## 5.0 Data Model & Validation

- **Schema** (`shared/schema.ts`)
  - Tables: `users`, `blog_posts`, `email_subscribers`, `journey_sessions`, `tasks`.
  - Indexes:
    - `blog_posts`: `idx_blog_posts_published_published_at` (published, published_at)
    - `email_subscribers`: `idx_email_subscribers_created_at` (created_at)
    - `journey_sessions`: `idx_journey_sessions_user_id`, `idx_journey_sessions_updated_at`
    - `tasks`: `idx_tasks_session_id`, `idx_tasks_user_id`

- **Validation** (drizzle‑zod)
  Insert/update schemas used in API:
  - Users: `insertUserSchema`
  - Blog: `insertBlogPostSchema`
  - Email: `insertEmailSubscriberSchema`
  - Journey: `insertJourneySessionSchema`, `updateJourneySessionSchema`
  - Tasks: `insertTaskSchema`, `updateTaskSchema`

---

## 6.0 Runtime, Storage, and DB

- **Storage selection** (`server/storage.ts`)
  - If `process.env.DATABASE_URL` present → `PostgresStorage`.
  - Else → `HybridStorage` (filesystem blog + in‑memory for others). Console logs indicate which path is active.

- **PostgreSQL** (`server/db.ts`, `server/postgresStorage.ts`)
  - TLS enforced with SNI pinned to original hostname.
  - Optional IPv4 host override via `PGHOSTADDR` or `DB_HOST_IPV4` while preserving certificate validation.
  - Drizzle queries used for CRUD across all entities.

---

## 7.0 API Endpoints

All Express endpoints are prefixed with `/api` and defined in `server/routes.ts`.

- **Blog**
  - `GET /api/blog/posts`
  - `GET /api/blog/posts/:slug`

- **Users**
  - `POST /api/users/register`

- **Email**
  - `POST /api/email/subscribe`

- **Journey Sessions**
  - `POST /api/journey/sessions`
  - `GET /api/journey/sessions/:sessionId`
  - `PUT /api/journey/sessions/:sessionId`
  - `GET /api/journey/sessions` (optional `?sessionId=` filter)
  - `GET /api/journey/sessions/:sessionId/export`

- **Tasks**
  - `POST /api/tasks`
  - `GET /api/tasks` (optional `?sessionId=`)
  - `GET /api/tasks/session/:sessionId`
  - `PUT /api/tasks/:taskId`
  - `DELETE /api/tasks/:taskId`

- **Progress**
  - `GET /api/journey/progress/:sessionId`

- **Export (unified)**
  - `GET /api/journey/export/full/:sessionId`

- **SEO via Express**
  - `GET /sitemap.xml`
  - `GET /rss.xml`

- **Production Functions (Cloudflare Pages)**
  - Blog GET/HEAD endpoints and OAuth endpoints are served by Cloudflare Functions in production. E2E tests validate caching and security headers:
    - `tests/e2e/blog-head.spec.ts`
    - `tests/e2e/oauth-headers.spec.ts`
  - Lead Magnet API: `POST /api/lead-magnet` (production only, JSON, size limit 2KB, origin allow‑list). Validated in `tests/e2e/lead-magnet.spec.ts`.
  - Functions consume JSON assets generated by `scripts/generate-seo.mjs` under `client/public/data/blog/`.

---

## 8.0 Security & Hardening

- **Cloudflare Pages headers** (`public/_headers`)
  - Site‑wide: `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` (locked down), `X-Frame-Options: DENY`, `Strict-Transport-Security`, `X-Robots-Tag: all`.
  - Admin (`/admin/*`): `X-Robots-Tag: noindex, nofollow, noarchive`, `Cache-Control: no-store`, `X-Frame-Options: SAMEORIGIN`, strict `Content-Security-Policy`.

- **OAuth (production Functions)**
  - `GET /api/oauth/auth` responds `302` with `no-store`, `no-referrer`, `nosniff`, HSTS; verified in `tests/e2e/oauth-headers.spec.ts`.
  - `HEAD` on `/api/oauth/*` responds with security headers including `Allow: GET, HEAD`.
  - Callback HTML enforces `no-store`, `no-referrer`, `nosniff`, `X-Frame-Options: DENY`, strict CSP (tested).

- **Blog API (production Functions)**
  - HEAD endpoints return caching metadata and `nosniff` in production; see `tests/e2e/blog-head.spec.ts`.

- **Lead Magnet API (production Functions)**
  - Enforces `Content-Type: application/json`; 2KB payload limit with `415/413` handling; JSON responses include `no-store` and `nosniff`. Verified in `tests/e2e/lead-magnet.spec.ts`.

- **Admin Access (Cloudflare Access)**
  - Scripted policy management via `scripts/cf-access-upsert-policy.mjs` using variant include rules and path‑aware app selection. Current policy allows any valid service token for `/admin` as a fallback, with plan to scope to a specific token when API schema is confirmed.

---

## 9.0 CI/CD & Automation

- **Workflows** (`.github/workflows/`)
  - `seed-blog.yml`: Seeds blog content from filesystem to Postgres; on failure creates a GitHub Issue (Slack removed). Artifacts include seed report.
  - `seed-audit.yml`: Audits seed parity/drift; drift detection creates a GitHub Issue; no Slack notifications.
  - `apply-rls.yml`: Applies and verifies RLS policies; on failure creates a GitHub Issue.
  - All relevant workflows grant `issues: write` and standardize on GitHub Issues for notifications.

- **Blog content pipeline**
  - `scripts/validate-blog.mjs`: Frontmatter/slug/content checks; exits non‑zero on blocking errors.
  - `scripts/seed-blog.mts`: Idempotent upsert to Postgres by `slug` with REST fallback (`SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`), writes `seed-report.json`.
  - `scripts/generate-seo.mjs`: Emits `sitemap.xml`, `rss.xml`, and blog JSON under `client/public/data/blog/*` for Functions consumption.

- **RLS management**
  - `scripts/apply-rls.mjs`, `scripts/verify-rls.mjs`, `scripts/verify-rls-rest.mjs`: Manage and verify RLS policies and REST behavior.

- **Cloudflare Access**
  - `scripts/cf-access-upsert-policy.mjs` (+ list apps/tokens helpers): Automates Access policy allowing service tokens for `/admin`.

---

## 10.0 Environment Variables & Secrets

- **Server/DB (Express + Drizzle)**
  - `DATABASE_URL` (required for Postgres)
  - `PGHOSTADDR` or `DB_HOST_IPV4` (optional IPv4 host override)
  - `PORT` (optional; defaults to 5000)
  - Note: the server loads a `.env` file from `website-integration/ArrowheadSolution/server/.env` if present (via `dotenv.config()` in `server/storage.ts`).

- **Frontend/Tests** (`.env.example`)
  - `VITE_TURNSTILE_SITE_KEY`
  - `PLAYWRIGHT_PROD_BASE_URL` (defaults to `https://project-arrowhead.pages.dev`)
  - `E2E_SKIP_LEAD_POSTS=1` (used when Turnstile is enforced)
  - Cloudflare Access for prod tests: `CF_ACCESS_CLIENT_ID`, `CF_ACCESS_CLIENT_SECRET`

- **Cloudflare Functions / CI (set in platform env)**
  - `PUBLIC_SITE_URL`
  - `ALLOWED_ORIGINS`
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY` (used by `scripts/seed-blog.mts` REST fallback)
  - `SUPABASE_LEADS_TABLE` (optional; defaults documented in functions)
  - `TURNSTILE_SECRET_KEY`
  - `TURNSTILE_REQUIRED` (`true`/`false`)

---

## 11.0 Testing Strategy

- **Playwright config** (`playwright.config.ts`)
  - Local: `chromium` with `webServer` (`npm run dev`) and `baseURL=http://localhost:5000`.
  - Production: `prod-chromium` with `baseURL=PLAYWRIGHT_PROD_BASE_URL` and optional Cloudflare Access headers.
  - Supports `PLAYWRIGHT_NO_WEBSERVER=1` for prod‑only runs.

- **Coverage** (`tests/e2e/`)
  - Blog listing/detail and ordering; XSS sanitization (`blog.spec.ts`, `blog-404.spec.ts`, `blog-order.spec.ts`).
  - Blog HEAD/caching headers (`blog-head.spec.ts`, `blog-headers.spec.ts`).
  - Lead Magnet API success and error cases (`lead-magnet.spec.ts`, `lead-headers.spec.ts`).
  - OAuth header hardening and redirects (`oauth-headers.spec.ts`).
  - Admin redirect and meta/robots behavior (`admin-redirect.spec.ts`, `admin.spec.ts`, `admin-noindex.spec.ts`).
  - SEO artifacts (`sitemap.spec.ts`, `rss.spec.ts`).
  - Full project export and PDF flows (various `full-project-pdf*.spec.ts`).

---

## 12.0 Operational Notes

- **Admin path** served by Express redirect to `/admin/index.html` (`server/index.ts`), with Cloudflare Access protecting production.
- **Blog data** in production is read by Functions from `client/public/data/blog/` (generated JSON) for performance and deterministic caching.
- **Logging** Minimal per‑request API logs for `/api/*` in `server/index.ts` with JSON body preview (truncated to keep logs concise).

---

## 13.0 Known Gaps

- None material at this time for the documented areas. Local dev may use hybrid/in‑memory storage when `DATABASE_URL` is absent.

---

## 14.0 Grounding References

- Backend
  - `server/index.ts`, `server/routes.ts`, `server/storage.ts`, `server/postgresStorage.ts`, `server/db.ts`
- Schema & Validation
  - `shared/schema.ts`
- Public Security Headers
  - `public/_headers`
- Scripts
  - `scripts/validate-blog.mjs`, `scripts/seed-blog.mts`, `scripts/generate-seo.mjs`
  - `scripts/verify-rls.mjs`, `scripts/verify-rls-rest.mjs`, `scripts/apply-rls.mjs`
  - `scripts/cf-access-upsert-policy.mjs`, `scripts/cf-access-list-apps.mjs`, `scripts/cf-access-list-service-tokens.mjs`
- Tests
  - `tests/e2e/*.spec.ts`
- Config
  - `tsconfig.json`, `playwright.config.ts`, `.env.example`
