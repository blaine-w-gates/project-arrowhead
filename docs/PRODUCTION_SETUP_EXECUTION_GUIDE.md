# Production Setup Execution Guide

**Date:** October 29, 2025  
**Purpose:** Step-by-step guide to set up test users and enable security  
**Audience:** PM / Webmaster  
**Status:** Ready to Execute

---

## 📋 Overview

This guide walks you through setting up the production environment for testing Project Arrowhead Teams MVP.

**What You'll Do:**
1. ✅ Seed 3 test users in Supabase
2. ✅ Verify login works
3. ✅ Enable Row Level Security (RLS)
4. ✅ Verify security warnings resolved

**Time Required:** 10-15 minutes

---

## 🎯 Prerequisites

Before starting, ensure you have:

- [ ] Supabase Dashboard access (https://supabase.com/dashboard)
- [ ] Project: `project-arrowhead` (ID: jzjkaxildffxhud9ecvp)
- [ ] SQL Editor permissions (can run queries)
- [ ] Access to this repository

---

## 🚀 PART 1: Seed Test Users

### **Current State (From Image 4)**

**Supabase Authentication > Users:** "No users in your project"

This is why login fails with "Invalid login credentials"

### **Goal**

Create 3 test users with pre-configured team relationships:
- test-owner@arrowhead.com (Account Owner)
- test-manager@arrowhead.com (Manager)
- test-member@arrowhead.com (Team Member)

### **Step 1: Open Supabase SQL Editor**

```
1. Go to: https://supabase.com/dashboard/project/jzjkaxildffxhud9ecvp
2. Click: Database (left sidebar)
3. Click: SQL Editor
4. Click: "+ New query" button
```

### **Step 2: Get the Seeding Script**

**Location in repo:** `scripts/seed-test-users.sql`

**OR copy from here:** [Expand below]

<details>
<summary><b>📋 Click to view complete seeding script</b></summary>

```sql
-- See scripts/seed-test-users.sql in repository
-- This script:
-- 1. Deletes existing test data (idempotent)
-- 2. Creates 3 test users in auth.users
-- 3. Creates "QA Test Team" in teams table
-- 4. Links users to team in team_members table
-- 5. Runs verification queries
```

**Full script is 270 lines** - use the file from the repo: `scripts/seed-test-users.sql`

</details>

### **Step 3: Run the Script**

```
1. Paste ENTIRE contents of seed-test-users.sql into SQL Editor
2. Click "Run" button (or press Ctrl+Enter / Cmd+Enter)
3. Wait 2-3 seconds for execution
```

### **Step 4: Verify Success**

**You should see 3 result sets at the bottom:**

**Result 1: Test Users Created (3 rows)**
```
              email              | email_confirmed_at |     created_at
─────────────────────────────────────────────────────────────────────
 test-member@arrowhead.com  | 2025-10-29 ...     | 2025-10-29 ...
 test-manager@arrowhead.com | 2025-10-29 ...     | 2025-10-29 ...
 test-owner@arrowhead.com   | 2025-10-29 ...     | 2025-10-29 ...
```

**Result 2: Test Team Created (1 row)**
```
    id     |     name      | subscription_status | trial_ends_at | created_at
───────────────────────────────────────────────────────────────────────────────
 <uuid> | QA Test Team | active              | 2026-10-29... | 2025-10-29...
```

**Result 3: Team Members Linked (3 rows)**
```
     name      |      role      | invite_status |            email
───────────────────────────────────────────────────────────────────────
 Test Owner   | Account Owner | active        | test-owner@arrowhead.com
 Test Manager | Manager       | active        | test-manager@arrowhead.com
 Test Member  | Team Member   | active        | test-member@arrowhead.com
```

✅ **If you see all 3 results, seeding was successful!**

### **Step 5: Verify in Authentication UI**

```
1. Go to: Authentication > Users (left sidebar)
2. You should now see 3 users:
   - test-owner@arrowhead.com (Confirmed)
   - test-manager@arrowhead.com (Confirmed)
   - test-member@arrowhead.com (Confirmed)
```

This replaces the "No users in your project" message.

---

## 🧪 PART 2: Test Login

### **Goal**

Verify that login now works with the seeded test accounts.

### **Step 1: Open Incognito Window**

```
Why Incognito? To avoid cached credentials or session issues.

Chrome: Ctrl+Shift+N (Windows) / Cmd+Shift+N (Mac)
Firefox: Ctrl+Shift+P (Windows) / Cmd+Shift+P (Mac)
Safari: File > New Private Window
```

### **Step 2: Navigate to Sign In Page**

```
URL: https://project-arrowhead.pages.dev/signin
```

### **Step 3: Open Browser DevTools**

```
Press F12 (or right-click > Inspect)
Go to: Network tab
Keep it open during login
```

### **Step 4: Attempt Login**

```
Email: test-owner@arrowhead.com
Password: TestPassword123!

Click "Sign In"
```

### **Step 5: Observe Network Requests**

**Expected Requests:**

1. **POST to Supabase auth endpoint**
   - Status: 200 OK ✅
   - Response: Contains access_token

2. **GET /api/auth/profile**
   - Status: 200 OK ✅
   - Response: Contains team info

**Expected Response from /api/auth/profile:**
```json
{
  "userId": "...",
  "email": "test-owner@arrowhead.com",
  "teamMemberId": "...",
  "teamId": "...",
  "teamName": "QA Test Team",
  "role": "Account Owner",
  "name": "Test Owner",
  "isVirtual": false,
  "subscriptionStatus": "active",
  "trialEndsAt": "2026-10-29...",
  "daysLeftInTrial": 365
}
```

### **Step 6: Verify Successful Login**

**Expected Behavior:**
- ✅ Redirect to `/dashboard` or `/dashboard/projects`
- ✅ See "QA Test Team" in header/navigation
- ✅ No "Invalid login credentials" error
- ✅ No "Failed to fetch" error

**If login succeeds, proceed to Part 3!**

---

## 🛑 Troubleshooting Login Issues

### **Issue: Still getting "Invalid login credentials"**

**Possible Causes:**
1. Script didn't run successfully
2. Users not created in auth.users

**Solution:**
```
1. Go to: Authentication > Users
2. Verify 3 test users are listed
3. If NOT listed:
   - Re-run the seeding script
   - Check for SQL errors in script output
   - Ensure you have permissions to insert into auth.users
```

### **Issue: "Failed to fetch" error**

**Possible Causes:**
1. Missing environment variables in Cloudflare
2. /api/auth/profile endpoint not deployed

**Solution:**
```
1. Check Cloudflare Pages > project-arrowhead > Settings > Environment variables
2. Verify these exist:
   - DATABASE_URL (encrypted)
   - SUPABASE_JWT_SECRET (encrypted)
   - SUPABASE_SERVICE_ROLE_KEY (encrypted)
   - PUBLIC_SITE_URL
3. Check latest deployment includes PR #143
```

### **Issue: 404 Not Found on /api/auth/profile**

**Possible Cause:** Cloudflare Function not deployed

**Solution:**
```
1. Check: https://project-arrowhead.pages.dev/api/auth/profile
2. Should return 401 (Unauthorized), not 404
3. If 404: Wait for Cloudflare deployment to complete
4. Check: Cloudflare Pages > Deployments > Latest status
```

---

## 🔒 PART 3: Enable Row Level Security

**⚠️ IMPORTANT: Only run this AFTER login is confirmed working!**

### **Current State (From Images 1 & 4)**

**Supabase Security Advisor:** 7+ warnings
- RLS Disabled on: tasks, journey_sessions, admin_users, etc.

### **Goal**

Enable RLS enforcement on all tables to secure the database.

### **Step 1: Understand What RLS Does**

**Before RLS:**
- Any authenticated user can access ANY row
- Security policies exist but are NOT enforced
- Critical vulnerability

**After RLS:**
- Users only see data they're authorized to access
- Policies from migration 0001_team_mvp_rls_policies.sql now apply
- Multi-tenancy enforced

### **Step 2: Get the RLS Migration**

**Location in repo:** `drizzle/migrations/0004_enable_rls_all_tables.sql`

**OR from PR #144:** https://github.com/blaine-w-gates/project-arrowhead/pull/144

### **Step 3: Run the Migration**

```
1. Open: Supabase Dashboard > Database > SQL Editor > New Query
2. Paste: Entire contents of 0004_enable_rls_all_tables.sql
3. Click: "Run" button
4. Wait: 3-5 seconds for execution
```

### **Step 4: Verify RLS Enabled**

**The migration includes a verification query that runs automatically.**

**Expected Output (at end of results):**

```
 tablename                        | rls_enabled | status
──────────────────────────────────────────────────────────
 admin_audit_log                 | t           | ✅ RLS Enabled
 admin_users                     | t           | ✅ RLS Enabled
 dial_states                     | t           | ✅ RLS Enabled
 email_subscribers               | t           | ✅ RLS Enabled
 journey_sessions                | t           | ✅ RLS Enabled
 leads                           | t           | ✅ RLS Enabled
 objectives                      | t           | ✅ RLS Enabled
 projects                        | t           | ✅ RLS Enabled
 rrgt_items                      | t           | ✅ RLS Enabled
 task_assignments                | t           | ✅ RLS Enabled
 tasks                           | t           | ✅ RLS Enabled
 team_member_project_assignments | t           | ✅ RLS Enabled
 team_members                    | t           | ✅ RLS Enabled
 teams                           | t           | ✅ RLS Enabled
 touchbases                      | t           | ✅ RLS Enabled
```

✅ **All tables should show `rls_enabled = t`**

### **Step 5: Check Security Advisor**

```
1. Go to: Advisors > Security Advisor (left sidebar)
2. Expected: Zero "RLS Disabled in Public" warnings
3. Before: 7+ warnings (Image 1)
4. After: 0 warnings ✅
```

### **Step 6: Re-Test Login**

**Critical: Verify RLS didn't break legitimate access**

```
1. Open new Incognito window
2. Go to: https://project-arrowhead.pages.dev/signin
3. Login: test-owner@arrowhead.com / TestPassword123!
4. Expected: Still works! ✅
5. Expected: Dashboard loads ✅
6. Expected: Can see "QA Test Team" data ✅
```

---

## ✅ Verification Checklist

After completing all parts, verify:

### **Authentication**
- [ ] 3 test users visible in Supabase Auth > Users
- [ ] test-owner@arrowhead.com login succeeds
- [ ] Dashboard loads after login
- [ ] "QA Test Team" appears in header
- [ ] GET /api/auth/profile returns 200 OK

### **Security**
- [ ] RLS enabled on all 17 tables
- [ ] Security Advisor shows 0 warnings
- [ ] Login still works after enabling RLS
- [ ] Can access team data (authorized)
- [ ] Cannot access other teams' data (unauthorized)

### **Test Credentials Available**

| Email | Password | Role | Status |
|-------|----------|------|--------|
| test-owner@arrowhead.com | TestPassword123! | Account Owner | ✅ Working |
| test-manager@arrowhead.com | TestPassword123! | Manager | ✅ Working |
| test-member@arrowhead.com | TestPassword123! | Team Member | ✅ Working |

**Team:** QA Test Team (Active subscription, no trial restrictions)

---

## 🎉 Success Criteria

**All systems operational when:**

1. ✅ Can login with test-owner@arrowhead.com
2. ✅ Dashboard shows "QA Test Team"
3. ✅ Network tab shows 200 OK for /api/auth/profile
4. ✅ Security Advisor shows 0 warnings
5. ✅ All tables have RLS enabled

**You can now:**
- Share test credentials with beta testers
- Begin manual QA of Team MVP features
- Test all three user roles (Owner, Manager, Member)
- Verify permission boundaries

---

## 📞 Need Help?

### **Common Issues**

**Login fails after seeding:**
- Check: Authentication > Users (users created?)
- Check: SQL Editor output (any errors?)
- Try: Re-run seed script (it's idempotent)

**RLS breaks access:**
- Check: Migration ran successfully?
- Check: Verification query shows all tables enabled?
- Emergency: Can temporarily disable RLS for debugging

**Environment variable issues:**
- Check: Cloudflare Pages > Settings > Environment variables
- Verify: All required variables from Image 2 present
- Check: DATABASE_URL, SUPABASE_JWT_SECRET especially

### **Emergency Rollback**

If RLS causes critical issues:

```sql
-- Temporarily disable RLS (debugging only)
ALTER TABLE public.teams DISABLE ROW LEVEL SECURITY;
-- (repeat for other tables as needed)

-- Re-enable after fixing:
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams FORCE ROW LEVEL SECURITY;
```

**⚠️ Never leave RLS disabled in production!**

---

## 📊 Related Documentation

- **Test User Seeding:** `scripts/seed-test-users.sql`
- **Testing Guide:** `docs/TESTING_SETUP.md`
- **Environment Setup:** `docs/PRODUCTION_ENV_SETUP.md`
- **RLS Migration:** `drizzle/migrations/0004_enable_rls_all_tables.sql`
- **Deployment Verification:** `docs/DEPLOYMENT_VERIFICATION_REPORT.md`

---

## 📝 After Successful Setup

### **Share with Beta Testers**

**Email Template:**

---

**Subject:** Project Arrowhead Teams - Beta Testing Access

Hi!

You've been invited to beta test Project Arrowhead Teams.

**Access the App:**
https://project-arrowhead.pages.dev

**Your Test Credentials:**
- **Email:** test-owner@arrowhead.com (or test-manager/test-member)
- **Password:** TestPassword123!

**What to Test:**
1. Sign in with credentials above
2. Explore the dashboard
3. Create a new project
4. Try the Objectives module
5. Test the Scoreboard (task management)
6. Use the RRGT dashboard
7. Try the Touchbase feature

**Please Report:**
- Any bugs or errors you encounter
- Features that feel confusing
- Things that work great!
- Suggestions for improvement

**Team:** You'll be part of "QA Test Team" for testing.

Thanks for helping make this better! 🚀

---

---

## 🎯 Next Phase: Beta Testing

Once setup is complete:

1. **Share credentials** with beta testers
2. **Collect feedback** on Team MVP features
3. **Monitor errors** in Cloudflare logs
4. **Track usage** to validate product-market fit
5. **Iterate** based on tester feedback

---

**Setup Guide Version:** 1.0  
**Last Updated:** October 29, 2025  
**Status:** ✅ Ready to Execute
