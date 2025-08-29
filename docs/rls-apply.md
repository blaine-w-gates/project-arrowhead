# Apply Row Level Security (RLS) to Production

This project verifies RLS behavior in CI via the Supabase REST API. Applying the RLS SQL itself is a manual step run in the Supabase SQL Editor to avoid unreliable direct database connectivity from GitHub-hosted runners.

## SQL to Apply
- Migration file: `website-integration/ArrowheadSolution/drizzle/migrations/0001_blog_posts_rls.sql`

## Steps (Project Manager)
1. Open the Supabase Dashboard for the production project.
2. Navigate to SQL Editor.
3. Open the SQL file above locally and paste its full contents into the editor.
4. Execute the SQL and confirm success.
5. Trigger the GitHub Actions workflow "Manage & Verify RLS Policies" to validate behavior.

## Expected REST Behavior (after apply)
- Anonymous (anon) key:
  - `GET /rest/v1/blog_posts?select=slug` returns only published posts.
  - `GET /rest/v1/blog_posts?select=slug&published=eq.false` returns an empty array.
- Service role key:
  - `GET /rest/v1/blog_posts?select=slug&published=eq.false` returns drafts (bypasses RLS).

## CI Workflow for Verification
- Workflow file: `.github/workflows/apply-rls.yml`
- Required secrets (Environment: Production):
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `SUPABASE_ANON_KEY`

The workflow runs `website-integration/ArrowheadSolution/scripts/verify-rls-rest.mjs` and uploads `verify-rls-rest.json` and a log file as artifacts.
