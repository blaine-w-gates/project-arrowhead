# Quick Start Guide - Fix Environment Variables

## ❌ Current Error
```
Error: SUPABASE_URL environment variable is required
```

## ✅ Solution: Add Supabase Credentials

### Step 1: Get Your Supabase Credentials

1. Go to: **https://supabase.com/dashboard**
2. Select your Project Arrowhead project
3. Go to: **Project Settings → API**
4. Copy these values:

```
Project URL: https://xxxxxxxxxxxxx.supabase.co
anon public key: eyJhbGciOiJ...
service_role key: eyJhbGciOiJ...
```

5. Go to: **Project Settings → Configuration**
6. Copy:
```
JWT Secret: your-jwt-secret-here
```

### Step 2: Update `.env` File

Open `.env` and replace the placeholder values:

```bash
# Replace these 5 values:

SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co  # From step 4
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJ...  # service_role from step 4
SUPABASE_JWT_SECRET=your-jwt-secret  # From step 5

VITE_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co  # Same as SUPABASE_URL
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJ...  # anon key from step 4
```

### Step 3: Run Tests

```bash
# Start dev server
npm run dev

# In a new terminal, run tests
npm run test:e2e -- tests/e2e/team-invitations.spec.ts --headed
```

---

## 🎯 Alternative: Copy from Existing Config

If you've run this app before, you might have credentials in another location.

**Check these files:**
- `/Users/jamesgates/Documents/ProjectArrowhead/.env`
- Any backup `.env` files
- Supabase project dashboard

---

## 🚨 If You Don't Have a Supabase Project

1. Create one at: https://supabase.com/dashboard
2. Follow the setup guide in: `docs/PRODUCTION_ENV_SETUP.md`

---

## 📋 Quick Command Reference

```bash
# Make sure you're in the right directory
cd /Users/jamesgates/Documents/ProjectArrowhead/website-integration/ArrowheadSolution

# Check .env file
cat .env

# Start dev server
npm run dev

# Run E2E tests (in new terminal)
npm run test:e2e -- tests/e2e/team-invitations.spec.ts --headed

# Run with trace viewer
npm run test:e2e -- tests/e2e/team-invitations.spec.ts --trace on
npx playwright show-report
```

---

## ✅ Success Indicators

You'll know it worked when you see:

```bash
✅ Using PostgreSQL for storage
AdminJS: bundling user components...
✨ Successfully built AdminJS bundle files! ✨
✅ AdminJS started on http://localhost:5000/admin
env=development isDev=true hasBuild=false
serving on port 5000
```

**No more "SUPABASE_URL environment variable is required" error!**
