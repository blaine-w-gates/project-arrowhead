# Project Arrowhead

> Start Here: Read the unified Operating System (OS): [docs/Project_Arrowhead_OS_v1.md](docs/Project_Arrowhead_OS_v1.md)

A web application for habit formation and task management using brainstorming and prioritization techniques.

## CI Blog Seeding (Supabase)

The repository contains a GitHub Actions workflow `Seed Blog to Postgres` that keeps the Supabase `blog_posts` table in sync with the filesystem content under `website-integration/ArrowheadSolution/content/blog/`.

Key points:

- The workflow can be run manually (workflow_dispatch) and also runs automatically on push to `main` when files under `website-integration/ArrowheadSolution/content/blog/**` change.
- It writes a `seed-report.json` into `website-integration/ArrowheadSolution/` and uploads it as a build artifact. A short summary is posted to the job summary as well.
- Concurrency is enabled so that only the latest run per branch is active.

### Connectivity strategy

- Primary path: REST fallback using Supabase PostgREST to avoid IPv6-only TCP issues on some runners.
- Direct Postgres path: If REST secrets are not provided, the workflow resolves an IPv4 address and exports `PGHOSTADDR`. The app layer honors this and preserves TLS SNI. This may still fail if the hostname has no A records.

### Required GitHub Secrets

Add these repository secrets (Settings → Secrets and variables → Actions):

- `SUPABASE_DATABASE_URL` – Postgres connection string for the project.
- `SUPABASE_URL` – Supabase project URL, e.g. `https://<project>.supabase.co`.
- `SUPABASE_SERVICE_ROLE_KEY` – Service role key for REST upserts. Keep secret.

When `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are present, the seeder uses REST. Otherwise it attempts direct Postgres with IPv4 enforcement.

### Running locally

From `website-integration/ArrowheadSolution/`:

```bash
# Ensure dependencies are installed
npm ci

# Required env
export DATABASE_URL='postgres://...'
# Optional REST fallback envs (preferred)
export SUPABASE_URL='https://<project>.supabase.co'
export SUPABASE_SERVICE_ROLE_KEY='<service_role>'

npm run db:seed:blog
```

This will produce `seed-report.json` with a summary of inserted/updated rows or upsert count.

## Getting Started (React/TypeScript App)

From `website-integration/ArrowheadSolution/`:

```bash
# 1) Install dependencies (Node.js v20+ recommended)
npm install

# 2) Start the full-stack dev server (Express API + Vite client)
npm run dev
# App will be available at http://localhost:5000
```

## End-to-End Tests (Playwright)

Playwright is configured to automatically start or reuse the dev server via `webServer`.

From `website-integration/ArrowheadSolution/`:

```bash
# First time only: install browsers
npm run test:install

# Headless run (default project: chromium)
npm run test:e2e

# Headed run
npm run test:e2e:headed
```

Notes:
- Base URL defaults to `http://localhost:5000` (see `playwright.config.ts`).
- If a local dev server is already running, tests will reuse it outside CI.

## Tech Stack (Current)

- Frontend: React 18, TypeScript, Vite, Wouter, Tailwind CSS
- Backend: Node.js, Express
- Data/Persistence: Drizzle ORM (schema/types); in-memory storage currently; PostgreSQL/Supabase target
- Testing: Playwright (`npm run test:e2e`)
- CI/Content: GitHub Actions blog seeding to Supabase
