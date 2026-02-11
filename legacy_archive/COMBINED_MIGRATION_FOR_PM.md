# 🚀 COMBINED DATABASE MIGRATION - PM INSTRUCTIONS

**Status:** Ready to Execute  
**Date:** October 31, 2025

---

## ⚠️ CRITICAL: Run This BEFORE Seed Script

This combined migration creates all tables, policies, and triggers. The seed script will fail without these tables.

---

## 📋 Complete SQL Script Location

**All migration files are in:** `/drizzle/migrations/`

**Execute these files in Supabase SQL Editor in this order:**

### 1. Create Tables (0000_flawless_medusa.sql)
- Creates 18 tables
- Creates all foreign keys
- Creates all indexes
- **File:** `drizzle/migrations/0000_flawless_medusa.sql` (294 lines)

### 2. Add Version Columns (0001_crazy_lenny_balinger.sql) 
- Adds version tracking to objectives and touchbases
- **File:** `drizzle/migrations/0001_crazy_lenny_balinger.sql` (2 lines)

### 3. Create RLS Policies (0001_team_mvp_rls_policies.sql)
- Creates security helper functions
- Creates all RLS policies
- **File:** `drizzle/migrations/0001_team_mvp_rls_policies.sql` (473 lines)

### 4. Add Trial Column (0002_previous_dagger.sql)
- Adds trial_ends_at to teams table
- **File:** `drizzle/migrations/0002_previous_dagger.sql` (1 line)

### 5. Add Stripe Columns (0003_ordinary_namor.sql)
- Adds Stripe fields to teams table
- **File:** `drizzle/migrations/0003_ordinary_namor.sql` (2 lines)

### 6. Create Triggers (0003_team_mvp_triggers.sql)
- Auto-completion tracking
- User invitation linking
- **File:** `drizzle/migrations/0003_team_mvp_triggers.sql` (132 lines)

---

## 🎯 STEP-BY-STEP EXECUTION

### Step 1: Open Supabase SQL Editor

1. Go to: https://supabase.com/dashboard/project/jzjkaxildffxhudeocvp
2. Click: **Database** (left sidebar)
3. Click: **SQL Editor**
4. Click: **"+ New query"**

### Step 2: Copy Migration 1 (Tables)

**Open file:** `website-integration/ArrowheadSolution/drizzle/migrations/0000_flawless_medusa.sql`

**Copy entire content** and paste into SQL Editor, then click **"Run"**

Expected: "Success. No rows returned"

### Step 3: Copy Migration 2 (Versions)

**Open file:** `website-integration/ArrowheadSolution/drizzle/migrations/0001_crazy_lenny_balinger.sql`

**Copy entire content** and paste into SQL Editor, then click **"Run"**

### Step 4: Copy Migration 3 (RLS Policies) - CRITICAL

**Open file:** `website-integration/ArrowheadSolution/drizzle/migrations/0001_team_mvp_rls_policies.sql`

**Copy entire content** and paste into SQL Editor, then click **"Run"**

### Step 5: Copy Migration 4 (Trial)

**Open file:** `website-integration/ArrowheadSolution/drizzle/migrations/0002_previous_dagger.sql`

**Copy entire content** and paste into SQL Editor, then click **"Run"**

### Step 6: Copy Migration 5 (Stripe)

**Open file:** `website-integration/ArrowheadSolution/drizzle/migrations/0003_ordinary_namor.sql`

**Copy entire content** and paste into SQL Editor, then click **"Run"**

### Step 7: Copy Migration 6 (Triggers)

**Open file:** `website-integration/ArrowheadSolution/drizzle/migrations/0003_team_mvp_triggers.sql`

**Copy entire content** and paste into SQL Editor, then click **"Run"**

---

## ✅ Verification

After running all 6 migrations, verify tables exist:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

**Expected: 18 tables including:**
- teams
- team_members
- projects
- objectives
- tasks
- rrgt_items
- touchbases
- dial_states
- And 10 more...

---

## ⏭️ NEXT STEP: Seed Test Users

**ONLY AFTER** all 6 migrations succeed, run:

**File:** `scripts/seed-test-users.sql`

This will create:
- 3 test users in auth.users
- 1 test team ("QA Test Team")
- 3 team member links

**Then test login at:** https://project-arrowhead.pages.dev/signin

---

## 🆘 If Any Migration Fails

**Take screenshot of error and send to Architect**

Common issues:
- Table already exists → Some migrations already ran
- Permission denied → Need service role access
- Syntax error → Copy/paste issue

---

**Questions?** Ask Cascade or Architect 11
