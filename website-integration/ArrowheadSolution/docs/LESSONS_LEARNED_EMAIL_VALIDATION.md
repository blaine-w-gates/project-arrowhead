# Lessons Learned: Email Validation Bug (Phase 2.3)

**Date:** November 19, 2025  
**Issue:** E2E tests timing out due to invalid email domain  
**Root Cause:** Frontend validation rejected `@arrowhead.test` TLD

---

## What Went Wrong

### The Error Chain:
1. ❌ Tests used `@arrowhead.test` email domain
2. ❌ Frontend validation rejected it: `"Email address ...@arrowhead.test is invalid"`
3. ❌ Form never submitted (no network call)
4. ❌ No redirect to `/dashboard`
5. ❌ Test timed out after 30s waiting

### Visual Evidence:
Screenshots clearly showed the red error message at the top of the signup form.

---

## What I Should Have Done

### Debugging Checklist (I Missed #3-5):
1. ✅ Check timeout values → Fixed (10s → 30s)
2. ✅ Check error handling → Fixed (safe JSON parsing)
3. ❌ **Check test screenshots** → MISSED
4. ❌ **Verify form validation errors** → MISSED
5. ❌ **Test email domain compatibility** → MISSED

### The Signal I Ignored:
```
TimeoutError: page.waitForURL: Timeout 30000ms exceeded.
```

**I treated this as a timeout issue, not a form validation issue.**

---

## The Fix

### Changed Email Domain:
```typescript
// BEFORE (REJECTED)
`e2e-test-${timestamp}-${random}@arrowhead.test`

// AFTER (ACCEPTED)
`e2e-test-${timestamp}-${random}@example.com`
```

### Files Updated:
1. `tests/e2e/project-lifecycle.spec.ts`
2. `tests/e2e/team-invitations.spec.ts` (both helpers)
3. `tests/e2e/user-onboarding.spec.ts`

---

## Why `@example.com` Works

### Standard Test Domains:
- ✅ `@example.com` - IANA reserved for documentation
- ✅ `@example.org` - Also valid
- ✅ `@example.net` - Also valid
- ✅ `@test.com` - Real TLD (works but not ideal)
- ❌ `@arrowhead.test` - Rejected by most validators
- ❌ `@foo.bar` - `.bar` exists but suspicious

### Email Validation Logic:
Most validators check:
1. Format: `user@domain.tld`
2. Domain has valid TLD (`.com`, `.org`, etc.)
3. Domain isn't suspicious

**`.test` TLD exists but is often blocked by validators to prevent spam.**

---

## How to Prevent This

### 1. Always Check Screenshots First
When tests timeout:
1. **Look at screenshots** (`test-results/*/test-failed-1.png`)
2. Check for UI error messages
3. Verify form state (submitted vs. blocked)

### 2. Check Browser Console
Screenshots show the visible error, console shows:
- Network errors
- JavaScript errors
- Validation failures

### 3. Use Standard Test Data
For emails:
- ✅ `@example.com`
- ✅ `@example.org`

For phone numbers:
- ✅ `555-0100` to `555-0199` (US reserved)

For addresses:
- ✅ 123 Test St, Test City, TS 12345

---

## Diagnostic Commands

### View Screenshot:
```bash
open test-results/project-lifecycle-Project--d0264--fill-out-5-question-vision-chromium/test-failed-1.png
```

### View Trace:
```bash
npx playwright show-trace test-results/project-lifecycle-Project--d0264--fill-out-5-question-vision-chromium/trace.zip
```

### Check Console Logs:
Trace viewer shows:
- Network tab
- Console errors
- Timeline of actions

---

## Success Indicators (Post-Fix)

### Before (FAILED):
```
📧 Test email: e2e-test-1763551110571-idzm7p@arrowhead.test
📝 Step 1: Setting up Account Owner...
⏱️ Timeout after 30s waiting for /dashboard
```

### After (EXPECTED):
```
📧 Test email: e2e-test-1763551110571-idzm7p@example.com
📝 Step 1: Setting up Account Owner...
✅ Signup successful - redirected to dashboard
🏢 Waiting for team initialization modal...
```

---

## Architect & Webmaster Feedback

### Webmaster:
> "The logs tell us exactly what is wrong. Looking at the logs, the test is still using @arrowhead.test. Supabase is rejecting this email immediately."

**Correct:** Frontend validation, not Supabase.

### Architect:
> "Based on the screenshots you uploaded, the Webmaster is 100% correct. The screenshots clearly show the UI error message."

**Key Point:** Screenshots provided the smoking gun evidence.

---

## What I Learned

### 1. Screenshots > Logs
Visual evidence often shows issues that logs don't capture.

### 2. Root Cause > Symptoms
- **Symptom:** Timeout
- **Root Cause:** Invalid email domain

I fixed the timeout but missed the real issue.

### 3. Validate Test Data
Always use standard, validator-friendly test data:
- ✅ `@example.com` for emails
- ✅ `555-0100` for phones
- ✅ Reserved test ranges for all inputs

### 4. Proactive Investigation
When tests fail:
1. Check screenshots FIRST
2. Look for UI errors
3. Verify network requests happened
4. THEN investigate timeouts/errors

---

## Improved Debugging Workflow

### Step 1: Visual Check
```bash
# View all failed test screenshots
open test-results/*/test-failed-1.png
```

### Step 2: Trace Analysis
```bash
# Interactive trace viewer
npx playwright show-trace test-results/*/trace.zip
```

### Step 3: Log Review
Only after visual checks, review logs for:
- Network errors
- Console errors
- Unexpected redirects

---

## Summary

**Issue:** Email domain validation  
**Impact:** 100% test failure rate  
**Fix Time:** 2 minutes (once identified)  
**Time Wasted:** ~30 minutes (debugging wrong issue)

**Key Takeaway:** Check screenshots before logs. Visual evidence shows the real problem faster.

---

## Prevention Checklist

For future E2E test failures:

- [ ] Open test screenshots
- [ ] Look for UI error messages
- [ ] Check browser console in trace viewer
- [ ] Verify network requests in trace viewer
- [ ] Confirm test data is validator-friendly
- [ ] THEN investigate timeouts/errors

**This would have caught the issue in 30 seconds instead of 30 minutes.**
