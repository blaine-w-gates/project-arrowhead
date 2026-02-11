# Testing Setup Guide

**Version:** 1.0  
**Last Updated:** October 29, 2025  
**Purpose:** Configure test users and team for QA and E2E testing

---

## Overview

This guide explains how to set up test users and a test team in your database to enable comprehensive testing of Project Arrowhead Team MVP features.

**What This Creates:**
- 3 test user accounts (Account Owner, Manager, Team Member)
- 1 test team ("QA Test Team") with active subscription
- Team member relationships with appropriate roles

---

## Prerequisites

- [ ] Access to Supabase project (local or remote)
- [ ] Supabase service role key (can insert into `auth.users`)
- [ ] One of the following:
  - Supabase CLI installed (`npm install -g supabase`)
  - Direct PostgreSQL access (`psql`)
  - Supabase Dashboard access

---

## Test User Credentials

### Account Owner
- **Email:** `test-owner@arrowhead.com`
- **Password:** `TestPassword123!`
- **Role:** Account Owner
- **Permissions:** Full access to team, can manage members, billing, etc.

### Manager
- **Email:** `test-manager@arrowhead.com`
- **Password:** `TestPassword123!`
- **Role:** Manager
- **Permissions:** Can manage projects, assign tasks, view team data

### Team Member
- **Email:** `test-member@arrowhead.com`
- **Password:** `TestPassword123!`
- **Role:** Team Member
- **Permissions:** Can view projects, complete assigned tasks

### Test Team
- **Name:** QA Test Team
- **Subscription Status:** Active
- **Trial End:** 1 year from creation
- **Features:** Full Team MVP access

---

## Setup Methods

### Method 1: Supabase CLI (Recommended)

**Best for:** Local development, CI/CD pipelines

**Steps:**

1. **Install Supabase CLI** (if not already installed):
   ```bash
   npm install -g supabase
   ```

2. **Login to Supabase:**
   ```bash
   supabase login
   ```

3. **Link to your project** (if not already linked):
   ```bash
   supabase link --project-ref YOUR_PROJECT_ID
   ```

4. **Run seeding script:**
   ```bash
   cd website-integration/ArrowheadSolution
   supabase db execute -f scripts/seed-test-users.sql
   ```

5. **Verify:**
   ```bash
   supabase db execute --query "SELECT email FROM auth.users WHERE email LIKE 'test-%@arrowhead.com'"
   ```

**Expected Output:**
```
              email
───────────────────────────────────
 test-member@arrowhead.com
 test-manager@arrowhead.com
 test-owner@arrowhead.com
```

---

### Method 2: Direct PostgreSQL (psql)

**Best for:** Advanced users with direct database access

**Steps:**

1. **Get your database connection string:**
   - Go to Supabase Dashboard > Project Settings > Database
   - Copy the connection string (Connection pooling → Transaction mode)
   - Format: `postgresql://postgres:[PASSWORD]@db.[PROJECT_ID].supabase.co:6543/postgres`

2. **Set environment variable:**
   ```bash
   export DATABASE_URL="postgresql://postgres:..."
   ```

3. **Run seeding script:**
   ```bash
   cd website-integration/ArrowheadSolution
   psql $DATABASE_URL -f scripts/seed-test-users.sql
   ```

4. **Verify:**
   ```bash
   psql $DATABASE_URL -c "SELECT email, role FROM auth.users JOIN team_members ON auth.users.id = team_members.user_id WHERE email LIKE 'test-%@arrowhead.com'"
   ```

---

### Method 3: Supabase Dashboard (Manual)

**Best for:** One-time setup, no CLI access

**Steps:**

1. **Open Supabase Dashboard:**
   - Navigate to your project
   - Click **SQL Editor** in left sidebar

2. **Open seed script:**
   - In your local editor, open: `scripts/seed-test-users.sql`
   - Copy entire contents

3. **Execute in dashboard:**
   - Paste into SQL Editor
   - Click **Run** button (or press Ctrl+Enter)

4. **Verify results:**
   - Scroll to bottom of output
   - You should see 3 verification query results:
     - Test users created
     - Test team created
     - Team member relationships created

5. **Check for errors:**
   - If you see "permission denied" errors, ensure you're using the service role
   - In SQL Editor settings, toggle "Run as service role" or "Bypass RLS"

---

### Method 4: Node.js Script (Informational)

**Note:** Direct SQL execution from Node.js is limited by Supabase's API. The provided `.mjs` script is informational and will guide you to use Method 1-3 instead.

**To see instructions:**
```bash
npm run db:seed:test-users
```

This will output setup instructions and exit.

---

## Verification

After running the seeding script, verify the setup:

### Check Test Users Exist

**SQL Query:**
```sql
SELECT 
  email,
  email_confirmed_at,
  created_at
FROM auth.users
WHERE email IN (
  'test-owner@arrowhead.com',
  'test-member@arrowhead.com',
  'test-manager@arrowhead.com'
)
ORDER BY email;
```

**Expected:** 3 rows with confirmed emails

### Check Test Team Exists

**SQL Query:**
```sql
SELECT 
  id,
  name,
  subscription_status,
  trial_ends_at
FROM teams
WHERE name = 'QA Test Team';
```

**Expected:** 1 row with status 'active'

### Check Team Members Linked

**SQL Query:**
```sql
SELECT 
  tm.name,
  tm.role,
  tm.invite_status,
  u.email
FROM team_members tm
JOIN auth.users u ON tm.user_id = u.id
WHERE tm.team_id = (SELECT id FROM teams WHERE name = 'QA Test Team')
ORDER BY tm.role DESC;
```

**Expected:** 3 rows (Account Owner, Manager, Team Member)

---

## Testing the Setup

### Manual Login Test

1. **Navigate to your application:**
   - Local: `http://localhost:5000/signin`
   - Staging: `https://your-staging-url.pages.dev/signin`

2. **Test Account Owner login:**
   - Email: `test-owner@arrowhead.com`
   - Password: `TestPassword123!`
   - Should redirect to `/dashboard`
   - Should see "QA Test Team" in header/profile

3. **Test permissions:**
   - Account Owner should see "Team Settings"
   - Manager should see project management features
   - Team Member should see limited access

### E2E Test Usage

**In Playwright tests:**
```typescript
// playwright.config.ts or test file
const TEST_USERS = {
  owner: {
    email: 'test-owner@arrowhead.com',
    password: 'TestPassword123!',
    role: 'Account Owner'
  },
  manager: {
    email: 'test-manager@arrowhead.com',
    password: 'TestPassword123!',
    role: 'Manager'
  },
  member: {
    email: 'test-member@arrowhead.com',
    password: 'TestPassword123!',
    role: 'Team Member'
  }
};

// In test
test('Account Owner can access team settings', async ({ page }) => {
  await page.goto('/signin');
  await page.fill('input[type="email"]', TEST_USERS.owner.email);
  await page.fill('input[type="password"]', TEST_USERS.owner.password);
  await page.click('button[type="submit"]');
  
  await expect(page).toHaveURL('/dashboard');
  // ... rest of test
});
```

---

## Cleanup / Reset

### Option 1: Re-run Seeding Script

The SQL script is **idempotent** - it will delete existing test data before recreating it.

Simply run the seeding script again using any method above.

### Option 2: Manual Deletion

**SQL Queries:**
```sql
-- Delete team members
DELETE FROM team_members 
WHERE team_id IN (SELECT id FROM teams WHERE name = 'QA Test Team');

-- Delete team
DELETE FROM teams WHERE name = 'QA Test Team';

-- Delete test users
DELETE FROM auth.users 
WHERE email IN (
  'test-owner@arrowhead.com',
  'test-member@arrowhead.com',
  'test-manager@arrowhead.com'
);
```

---

## Troubleshooting

### "permission denied for table auth.users"

**Problem:** You don't have service role access

**Solution:**
- In Supabase Dashboard SQL Editor, enable "Run as service role"
- Or use Supabase CLI which uses service role by default
- Or ensure `SUPABASE_SERVICE_ROLE_KEY` is set (not anon key)

### "duplicate key value violates unique constraint"

**Problem:** Test users already exist

**Solution:**
- The script deletes existing test users first
- If deletion fails, manually delete using cleanup queries above
- Then re-run seeding script

### Users created but can't sign in

**Problem:** Email not confirmed or password incorrect

**Solution:**
- Check `email_confirmed_at` is NOT NULL:
  ```sql
  SELECT email, email_confirmed_at FROM auth.users WHERE email = 'test-owner@arrowhead.com';
  ```
- If NULL, manually set:
  ```sql
  UPDATE auth.users SET email_confirmed_at = NOW() WHERE email = 'test-owner@arrowhead.com';
  ```
- Verify password is exactly: `TestPassword123!` (case-sensitive)

### Team created but users not linked

**Problem:** Team member relationships missing

**Solution:**
- Check team_members table:
  ```sql
  SELECT * FROM team_members WHERE team_id = (SELECT id FROM teams WHERE name = 'QA Test Team');
  ```
- If empty, re-run the INSERT statements from seed script
- Or re-run entire seed script

### "QA Test Team" not showing in dashboard

**Problem:** User may not be linked to team, or frontend not fetching correctly

**Solution:**
- Verify user-team link exists in database (see verification queries above)
- Check browser console for API errors
- Check `/api/auth/profile` endpoint returns team data
- Clear browser cache and local storage

---

## Environment-Specific Setup

### Local Development

Use local Supabase instance:
```bash
# Start local Supabase
supabase start

# Run seeding
supabase db execute -f scripts/seed-test-users.sql

# Get local URLs
supabase status
```

### Staging/Dev Environment

Use remote Supabase project:
```bash
# Link to staging project
supabase link --project-ref YOUR_STAGING_PROJECT_ID

# Run seeding
supabase db execute -f scripts/seed-test-users.sql
```

### Production

**⚠️ NEVER run test user seeding in production!**

Production should use real user accounts only.

---

## Security Considerations

### Development/Staging Only

- Test users are for **non-production environments only**
- Never create test users in production database
- Test credentials are documented (not secret)

### Password Security

- Test password (`TestPassword123!`) is intentionally simple
- It's documented publicly for QA purposes
- Production users should have strong, unique passwords

### Cleanup After Testing

- Consider deleting test users after major QA sessions
- Or reset them using the cleanup queries
- This prevents abandoned test data accumulation

---

## CI/CD Integration

### GitHub Actions Example

```yaml
name: E2E Tests

on: [push]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Supabase CLI
        run: npm install -g supabase
      
      - name: Setup test users
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
        run: |
          supabase link --project-ref ${{ secrets.SUPABASE_PROJECT_ID }}
          supabase db execute -f scripts/seed-test-users.sql
      
      - name: Run E2E tests
        run: npm run test:e2e
```

---

## Additional Test Data

If you need additional test data beyond users/teams:

- **Projects:** Create via UI after logging in as test-owner
- **Tasks:** Create via Objectives module or Scoreboard
- **Touchbase entries:** Create via Touchbase module
- **RRGT items:** Create via RRGT dashboards

Or extend `seed-test-users.sql` with additional INSERT statements for projects, objectives, etc.

---

## Reference

- **Seeding Script:** `scripts/seed-test-users.sql`
- **Node.js Wrapper:** `scripts/seed-test-users.mjs`
- **Supabase Docs:** https://supabase.com/docs/guides/cli/seeding
- **Sprint Plan:** See Revised Comprehensive Sprint Plan (Phase 3)

---

## Revision History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-10-29 | Initial test user seeding documentation |
