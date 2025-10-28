# E2E Test Suite - Setup Guide

## Overview

The E2E test suite uses Playwright to test both legacy features and Team MVP functionality.

## Test Categories

### 1. Legacy Tests (Passing in CI)
These tests cover the original blog, lead magnet, admin, and journey features:
- Blog & RSS tests
- Lead magnet tests
- Admin page tests  
- Journey PDF tests
- Data health tests

**Status:** ✅ Passing in CI - No setup required

### 2. Team MVP Tests (Requires Setup)
Tests for Team MVP authentication and dashboard features (Phase 3+):
- `team-mvp.spec.ts` - Comprehensive Team MVP flow tests

**Status:** ⚠️ SKIPPED in CI until test users configured

## Setting Up Team MVP Tests

### Prerequisites

1. **Supabase Project** with test database
2. **Test Users** seeded in `auth.users` table
3. **Environment Variables** in CI/local environment

### Required Test Users

#### Primary Test User (Account Owner/Manager)
- **Email:** `test@arrowhead.com` (or custom)
- **Password:** `TestPassword123!` (or custom)
- **Role:** Account Owner or Account Manager
- **Permissions:** Full access to all features

#### Secondary Test User (Team Member) - Optional
- **Email:** `member@arrowhead.com` (or custom)
- **Password:** `MemberPassword123!` (or custom)
- **Role:** Team Member
- **Permissions:** Limited to assigned tasks

### Environment Variables

Set these in your CI environment (GitHub Actions Secrets) or local `.env`:

```bash
# Required for team-mvp.spec.ts tests
E2E_TEST_EMAIL=test@arrowhead.com
E2E_TEST_PASSWORD=TestPassword123!

# Optional for Team Member role tests
E2E_TEST_MEMBER_EMAIL=member@arrowhead.com
E2E_TEST_MEMBER_PASSWORD=MemberPassword123!
```

### Local Setup

1. **Create test users in Supabase:**
   ```sql
   -- In Supabase SQL Editor
   -- Create Account Owner test user
   INSERT INTO auth.users (email, encrypted_password, email_confirmed_at)
   VALUES ('test@arrowhead.com', crypt('TestPassword123!', gen_salt('bf')), NOW());
   
   -- Create Team Member test user (optional)
   INSERT INTO auth.users (email, encrypted_password, email_confirmed_at)
   VALUES ('member@arrowhead.com', crypt('MemberPassword123!', gen_salt('bf')), NOW());
   ```

2. **Set environment variables:**
   ```bash
   export E2E_TEST_EMAIL="test@arrowhead.com"
   export E2E_TEST_PASSWORD="TestPassword123!"
   ```

3. **Run tests:**
   ```bash
   # Run all E2E tests
   npm run test:e2e
   
   # Run only Team MVP tests
   npx playwright test tests/e2e/team-mvp.spec.ts
   
   # Run in headed mode to watch
   npx playwright test tests/e2e/team-mvp.spec.ts --headed
   ```

### CI Setup (GitHub Actions)

Add secrets to your GitHub repository:

1. Go to **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret**
3. Add:
   - `E2E_TEST_EMAIL` = `test@arrowhead.com`
   - `E2E_TEST_PASSWORD` = `TestPassword123!`
   - `E2E_TEST_MEMBER_EMAIL` = `member@arrowhead.com` (optional)
   - `E2E_TEST_MEMBER_PASSWORD` = `MemberPassword123!` (optional)

4. Update your GitHub Actions workflow to pass these as env vars:
   ```yaml
   - name: Run Playwright tests
     env:
       E2E_TEST_EMAIL: ${{ secrets.E2E_TEST_EMAIL }}
       E2E_TEST_PASSWORD: ${{ secrets.E2E_TEST_PASSWORD }}
       E2E_TEST_MEMBER_EMAIL: ${{ secrets.E2E_TEST_MEMBER_EMAIL }}
       E2E_TEST_MEMBER_PASSWORD: ${{ secrets.E2E_TEST_MEMBER_PASSWORD }}
     run: npm run test:e2e
   ```

## Test Behavior

### When Credentials Are Missing

If `E2E_TEST_EMAIL` and `E2E_TEST_PASSWORD` are **not** set:
- ✅ Legacy tests run normally
- ⏭️ Team MVP tests are **skipped** with clear message
- ✅ CI pipeline passes

### When Credentials Are Provided

If credentials **are** set:
- ✅ Legacy tests run normally
- ✅ Team MVP tests run against real authentication
- ⚠️ Tests may fail if users don't exist or have wrong permissions

## Troubleshooting

### Tests Skip with "credentials not configured"
**Cause:** Environment variables not set  
**Fix:** Set `E2E_TEST_EMAIL` and `E2E_TEST_PASSWORD`

### Tests fail with "Authentication error"
**Cause:** Test users don't exist in Supabase  
**Fix:** Create test users in `auth.users` table

### Tests timeout on login
**Cause:** Supabase connection issues or wrong credentials  
**Fix:** 
1. Verify credentials are correct
2. Check Supabase project is running
3. Verify network connectivity

### Tests fail with "Permission denied"
**Cause:** Test user has wrong role  
**Fix:** Ensure test user has Account Owner or Account Manager role

## Test Structure

### team-mvp.spec.ts Tests

1. **Authentication Flow** (3 tests)
   - Redirect unauthenticated users
   - Successful login
   - Invalid credentials error

2. **Project Management** (2 tests)
   - Create project
   - Navigate to project details

3. **Task Management** (2 tests)
   - Create task in Scoreboard
   - Filter tasks by status

4. **RRGT Dashboard** (2 tests)
   - Display assigned tasks
   - Update task status

5. **Navigation** (2 tests)
   - Navigate between tabs
   - Maintain auth across refreshes

6. **Touchbase** (1 test)
   - Create touchbase entry

7. **Team Member Role** (1 test)
   - Verify Team Member restrictions

**Total:** 13 tests (all skip gracefully without credentials)

## Future Improvements

- [ ] Automated test user seeding script
- [ ] Mock authentication mode for faster tests
- [ ] Visual regression testing
- [ ] Performance testing
- [ ] Cross-browser compatibility verification
