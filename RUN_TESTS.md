# 🧪 Quick Test Commands

## Phase 2.3 - Project Lifecycle Tests

### Run Phase 2.3 Only (Recommended)
```bash
npm run test:e2e -- tests/e2e/project-lifecycle.spec.ts --headed
```

**Expected:** 3 tests pass in ~48 seconds

---

## All E2E Tests (Phases 2.1, 2.2, 2.3)

### Run All Tests
```bash
npm run test:e2e -- --headed
```

**Expected:** 13 tests pass

---

## Individual Phase Tests

### Phase 2.1: User Onboarding (5 tests)
```bash
npm run test:e2e -- tests/e2e/user-onboarding.spec.ts --headed
```

### Phase 2.2: Team Invitations (5 tests)
```bash
npm run test:e2e -- tests/e2e/team-invitations.spec.ts --headed
```

### Phase 2.3: Project Lifecycle (3 tests)
```bash
npm run test:e2e -- tests/e2e/project-lifecycle.spec.ts --headed
```

---

## Troubleshooting

### If you see "SUPABASE_URL required"
Your dev server needs Supabase credentials. They're already in `.env`!

**Fix:** Use the export trick
```bash
export $(grep -v '^#' .env | xargs) && npm run test:e2e -- tests/e2e/project-lifecycle.spec.ts --headed
```

### If tests timeout
- Check dev server is running: `http://localhost:5000`
- Supabase auth can take 15-30 seconds (now handled!)

### If cleanup fails
- **Local:** Check E2E_TEST_SECRET is set in `.env` ✅ Already set
- **Production:** Cleanup is disabled (expected behavior) ✅

---

## Quick Visual Check

### What Success Looks Like:
```
✅ Running 3 tests using 1 worker

  ✓ Can create project and fill 5-question vision (18s)
  ✓ Can archive and restore project (14s)
  ✓ Cannot delete project with objectives (delete protection) (16s)

  3 passed (48s)
```

### Cleanup Logs (Expected):
```
🧹 Starting cleanup for: e2e-test-1763550426417-78kdip@arrowhead.test
✅ Cleanup successful: { deleted: { teamMembers: 1, teams: 1, authUsers: 1 } }
```

Or for production tests:
```
🧹 Starting cleanup for: e2e-test-...@arrowhead.test
ℹ️ Cleanup skipped (production environment)
```

---

## Playwright Trace Viewer

### Generate Trace
```bash
npm run test:e2e -- tests/e2e/project-lifecycle.spec.ts --trace on
```

### View Trace
```bash
npx playwright show-report
```

Opens interactive UI showing:
- Timeline of all actions
- Screenshots at each step
- Network requests
- Console logs

---

## Report Success to Architect

Once all 3 tests pass, tell architect:

> "Phase 2.3 stabilization complete! ✅
> 
> - Timeout increased to 30s (handles Supabase auth latency)
> - Cleanup failures non-fatal (graceful degradation)
> - Safe JSON parsing (no crashes on errors)
> 
> All 3 project lifecycle tests passing:
> 1. ✅ Create project + vision
> 2. ✅ Archive & restore
> 3. ✅ Delete protection verified
> 
> Ready for Phase 2.4!"
