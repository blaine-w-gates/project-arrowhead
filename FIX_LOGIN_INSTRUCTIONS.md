# 🚀 FIX LOGIN - COMPLETE SOLUTION

**Problem:** Seed script creates broken users that crash on login  
**Solution:** Use Supabase Admin API to create proper users  
**Status:** Ready to execute

---

## ⚡ QUICK FIX (3 Steps - 5 Minutes)

### **STEP 1: Clean Database** ✅

Run in Supabase SQL Editor:

```sql
-- Remove broken test data
DELETE FROM public.team_members
WHERE team_id IN (SELECT id FROM public.teams WHERE name = 'QA Test Team');

DELETE FROM public.teams WHERE name = 'QA Test Team';

DELETE FROM auth.users
WHERE email IN (
  'test-owner@arrowhead.com',
  'test-member@arrowhead.com',
  'test-manager@arrowhead.com'
);

SELECT 'Cleanup complete' as status;
```

**Expected:** `status: "Cleanup complete"`

---

### **STEP 2: Run User Creation Script** ✅

In your terminal (from project root):

```bash
cd /Users/jamesgates/Documents/ProjectArrowhead/website-integration/ArrowheadSolution

node scripts/create-test-user-proper.mjs
```

**Expected Output:**
```
🚀 Creating test user via Supabase Admin API...

📝 Step 1: Creating auth user...
✅ Auth user created: <uuid>
   Email: test-owner@arrowhead.com
   Confirmed: Yes

📝 Step 2: Creating QA Test Team...
✅ Team created: <uuid>
   Name: QA Test Team
   Status: active
   Trial ends: <date>

📝 Step 3: Linking user to team...
✅ Team member created: <uuid>
   Role: Account Owner
   Status: active

🎉 SUCCESS! Test user setup complete.

📋 TEST CREDENTIALS:
   Email: test-owner@arrowhead.com
   Password: TestPassword123!
   Team: QA Test Team
   Role: Account Owner
   Subscription: Active (bypasses paywall)

🧪 NEXT STEP: Test login at:
   https://project-arrowhead.pages.dev/signin
```

---

### **STEP 3: Test Login** ✅

1. Open **incognito window**
2. Go to: https://project-arrowhead.pages.dev/signin
3. Login:
   - Email: `test-owner@arrowhead.com`
   - Password: `TestPassword123!`

**Expected Result:**
- ✅ Redirect to `/dashboard/projects`
- ✅ See "QA Test Team" in header
- ✅ No 500 errors
- ✅ No "Database error" messages

---

## 🆘 ALTERNATIVE: Use Signup Page (If Script Fails)

If the Node script doesn't work, use the signup page:

### A. Create User via Signup

1. Go to: https://project-arrowhead.pages.dev/signup
2. Sign up with:
   - Email: `test-owner@arrowhead.com`
   - Password: `TestPassword123!`
3. Check email and confirm (if required)
4. Try to login - you'll see "No team" error (expected)

### B. Link to Team (SQL)

Run in Supabase SQL Editor:

```sql
-- Create team
INSERT INTO public.teams (id, name, subscription_status, trial_ends_at, created_at, updated_at) 
VALUES (
  gen_random_uuid(), 
  'QA Test Team', 
  'active', 
  NOW() + INTERVAL '1 year', 
  NOW(), 
  NOW()
);

-- Link user to team
INSERT INTO public.team_members (id, team_id, user_id, name, role, invite_status, created_at, updated_at)
SELECT
  gen_random_uuid(),
  (SELECT id FROM public.teams WHERE name = 'QA Test Team'),
  (SELECT id FROM auth.users WHERE email = 'test-owner@arrowhead.com'),
  'Test Owner',
  'Account Owner',
  'active',
  NOW(),
  NOW();

SELECT 'User linked to team' as status;
```

### C. Test Login Again

Logout and login again - should work now!

---

## 🔍 WHY THIS WORKS

### ❌ **What Was Wrong:**

**Old Approach (seed-test-users.sql):**
```sql
-- This creates INCOMPLETE user records
INSERT INTO auth.users (email, encrypted_password, ...)
VALUES ('test@example.com', crypt('password', ...), ...);
```

**Missing Fields:**
- `confirmation_token` → NULL (causes crash)
- `recovery_token` → NULL (causes crash)
- `email_change_token_new` → NULL (causes crash)
- `confirmed_at` → NULL (user not confirmed)
- Plus 10+ other internal fields

**Result:** 500 errors on login

---

### ✅ **What's Right:**

**New Approach (Admin API):**
```javascript
await supabase.auth.admin.createUser({
  email: 'test@example.com',
  password: 'password',
  email_confirm: true // Auto-confirms
});
```

**Supabase internally sets:**
- ✅ All token fields properly
- ✅ All timestamp fields
- ✅ Email confirmation
- ✅ Password encryption
- ✅ Session management
- ✅ Metadata structure

**Result:** Proper user that can login successfully

---

## 📊 VERIFICATION CHECKLIST

After running the fix, verify:

### In Supabase Dashboard:

**Authentication > Users:**
- [ ] `test-owner@arrowhead.com` exists
- [ ] Email shows as "Confirmed"
- [ ] Created via "admin" (not via direct SQL)

**Database > teams table:**
- [ ] `QA Test Team` exists
- [ ] `subscription_status` = 'active'
- [ ] `trial_ends_at` is 1 year in future

**Database > team_members table:**
- [ ] Link exists for test-owner@arrowhead.com
- [ ] `role` = 'Account Owner'
- [ ] `invite_status` = 'active'
- [ ] `user_id` matches auth.users.id

### In Application:

**Login Page:**
- [ ] Can enter credentials
- [ ] No "Database error" message
- [ ] Login button works

**After Login:**
- [ ] Redirects to dashboard
- [ ] Shows "QA Test Team" in header
- [ ] No 500 errors in console
- [ ] `/api/auth/profile` returns 200 OK

---

## 🐛 TROUBLESHOOTING

### **Script fails with "createUser error"**

**Check:**
1. Service role key is correct (check `.env` or script)
2. Supabase project URL is correct
3. Network connection works

**Fix:** Use Alternative Method (signup page)

---

### **Login still shows 500 error**

**Check:**
1. Browser console for exact error
2. Supabase Auth logs (Dashboard > Authentication > Logs)
3. User actually exists in auth.users

**Fix:** Run cleanup script again, then recreation script

---

### **"No team" error after login**

**Check:**
1. `team_members` table has link
2. `user_id` matches `auth.users.id`
3. `invite_status` = 'active'

**Fix:** Run Step B from Alternative Method

---

## 🎯 SUCCESS CRITERIA

**You'll know it works when:**

1. ✅ Script runs without errors
2. ✅ Supabase shows confirmed user
3. ✅ Team and team_member records exist
4. ✅ Login redirects to dashboard
5. ✅ Dashboard shows "QA Test Team"
6. ✅ No 500 errors in console

---

## 📞 NEXT STEPS AFTER SUCCESS

Once login works:

1. **Enable RLS** (run `0004_enable_rls_all_tables.sql`)
2. **Re-test login** (ensure RLS doesn't break it)
3. **Create additional test users** (manager, member)
4. **Begin feature testing**

---

**Questions?** Run the script and let me know the output!
