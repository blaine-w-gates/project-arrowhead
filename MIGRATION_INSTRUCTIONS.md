# Team MVP Migration Instructions

## Problem Identified by Architect
Drizzle Kit was getting stuck in interactive prompts because it's comparing the new Team MVP schema against existing old tables in the database (users, tasks, journey_sessions, etc.).

## Solution Options

### Option A: Clean Existing Database (Recommended)
1. Access your Supabase dashboard at: https://supabase.com/dashboard
2. Navigate to your project
3. Go to SQL Editor
4. Run this SQL script:

```sql
-- Drop old application tables
DROP TABLE IF EXISTS auth_events CASCADE;
DROP TABLE IF EXISTS auth_totp CASCADE;
DROP TABLE IF EXISTS auth_otp CASCADE;
DROP TABLE IF EXISTS admin_audit_log CASCADE;
DROP TABLE IF EXISTS admin_users CASCADE;
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS journey_sessions CASCADE;
DROP TABLE IF EXISTS user_subscriptions CASCADE;
DROP TABLE IF EXISTS email_subscribers CASCADE;
DROP TABLE IF EXISTS blog_posts CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- drizzle_migrations table is preserved for migration history
```

5. Then run from your terminal:
```bash
cd /Users/jamesgates/Documents/ProjectArrowhead/website-integration/ArrowheadSolution
npm run db:generate
```

### Option B: Use Local Development Database
1. Start Docker Desktop
2. Start local database:
```bash
npm run db:up
```

3. Generate migration against local database:
```bash
DB_SSL_DISABLE=1 DATABASE_URL=postgresql://postgres:postgres@localhost:54322/arrowhead_dev npm run db:generate
```

### Option C: Manual Migration Creation
If automated generation continues to have issues, create the migration file manually in:
`drizzle/migrations/0001_team_mvp_initial.sql`

---

## Current Status
- ✅ Feature branch `feat/phase-1-database` created
- ✅ All 11 Team MVP schema files implemented in `/shared/schema/`
- ✅ Drizzle config updated to point to new schema structure  
- ⏳ Awaiting database cleanup to generate migration

## Next Steps After Migration Generated
1. Review generated migration SQL
2. Apply migration with `npm run db:push` or similar
3. Continue to Task 3: Implement RLS Policies
