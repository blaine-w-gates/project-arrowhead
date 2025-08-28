# Project Arrowhead

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

## Running End-to-End Tests

The E2E test suite uses a two-step, decoupled workflow:

**Step 1 (Manual):** In your first terminal, start the application server with the command:
```bash
python3 app.py
```

**Step 2 (Automated):** In a second terminal, run the entire test suite with the command:
```bash
npm test
```

The tests will run against the already-running server. Make sure the server is fully started and accessible at `http://127.0.0.1:5000` before running the tests.

## Development

This project uses:
- Python/Flask for the backend server
- Vanilla JavaScript for the frontend
- Puppeteer + Jest for end-to-end testing

## Project Structure

- `app.py` - Flask application server
- `index.html` - Main application entry point
- `brainstorm_step*.html` - Brainstorming journey pages
- `choose_step*.html` - Priority selection journey pages
- `TaskListPage.html` - Task management interface
- `tests/journeys.test.js` - End-to-end test suite
