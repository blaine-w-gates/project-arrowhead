# Strategic Testing & Deployment Plan
**Version:** 1.0  
**Created:** November 18, 2025  
**Purpose:** Comprehensive testing strategy and roadmap for paid version deployment

---

## Executive Summary

**Current State:** P0 hotfixes completed (PRs #155, #156, #157). Core objective journey functional.  
**Goal:** Full E2E test coverage, Stripe payment integration, production-ready paid tier.  
**Timeline:** 3-phase rollout over 2-3 weeks.

---

## Phase 1: Critical Path Stabilization (CURRENT)
**Status:** 🟡 In Progress  
**Duration:** 24-48 hours  
**Priority:** P0 - Blocking production issues

### Active Work
- [x] ✅ **PR #155**: PUT/DELETE project endpoints + lock endpoint (MERGED)
- [ ] 🔄 **PR #156**: Lock endpoint E2E test (CI running - cleanup 404 fix applied)
- [ ] 🔄 **PR #157**: Resume journey parsing bug + CF function parity (awaiting CI)

### Immediate Next Steps
1. **Monitor PR #156 CI** - Should pass with cleanup 404 filter
2. **Monitor PR #157 CI** - Resume fix + CF function
3. **Verify Production** - Confirm "Failed to load objective journey" error is resolved
4. **Manual Smoke Test** - Test full objective journey flow on production

**Success Criteria:**
- ✅ All PRs merged and deployed
- ✅ No error modals in production objective journey
- ✅ Lock acquisition works without 404/405 errors

---

## Phase 2: Comprehensive E2E Test Coverage (NEXT)
**Status:** 🔴 Not Started  
**Duration:** 1 week  
**Priority:** P1 - Enable confident deployments

### Testing Strategy

#### 1. Authentication & Onboarding Flow
**Coverage Gap:** No E2E test for signup → team init → first project

**Test Spec:** `tests/e2e/user-onboarding.spec.ts`
```typescript
test.describe('User Onboarding Flow', () => {
  test('Complete signup and team initialization', async ({ page }) => {
    // 1. Sign up with new user
    // 2. Initialize team (POST /api/auth/initialize-team)
    // 3. Verify 14-day trial starts
    // 4. Create first project
    // 5. Verify dashboard loads
    // 6. Check trial banner appears
  });
  
  test('Trial ending banner displays correctly', async ({ page }) => {
    // Mock trial ending in 2 days
    // Verify banner shows "Your trial ends in 2 days"
    // Click "Subscribe Now" → redirects to /pricing
  });
});
```

**What to Test:**
- [x] Sign up flow (`SignUp.tsx`)
- [x] Team initialization API (`POST /api/auth/initialize-team`)
- [x] Profile fetch (`GET /api/auth/profile`)
- [x] Trial countdown logic (`TrialEndingBanner.tsx`)
- [x] First project creation
- [x] Dashboard navigation

---

#### 2. Team Management & Invitations
**Coverage Gap:** No E2E test for virtual member → invite → accept flow

**Test Spec:** `tests/e2e/team-invitations.spec.ts`
```typescript
test.describe('Team Member Invitations', () => {
  test('Account Owner can invite virtual member', async ({ page }) => {
    // 1. Login as Account Owner
    // 2. Navigate to team settings
    // 3. Create virtual team member
    // 4. Click "Invite" button
    // 5. Enter email
    // 6. Verify invite sent (POST /api/team-members/:id/invite)
    // 7. Check member status = 'invite_pending'
  });
  
  test('Non-owner cannot send invitations', async ({ page }) => {
    // Login as Team Member role
    // Verify invite button is disabled/hidden
    // Attempt API call → 403 Forbidden
  });
});
```

**What to Test:**
- [x] Virtual member creation
- [x] Invite modal UI (`InviteMemberModal.tsx`)
- [x] Email uniqueness validation
- [x] Supabase invitation API integration
- [x] Role-based permissions (403 for non-admins)

---

#### 3. Project & Objective Management
**Coverage Gap:** Partial coverage (objectives-pages-functions.prod.spec.ts exists but limited)

**Test Spec:** `tests/e2e/project-lifecycle.spec.ts`
```typescript
test.describe('Project Lifecycle', () => {
  test('Create, update, archive, delete project', async ({ page }) => {
    // CREATE
    // 1. Click "Add Project"
    // 2. Enter project name
    // 3. Verify project appears in list
    
    // UPDATE
    // 4. Edit project name
    // 5. Add vision statement (VisionModal)
    // 6. Update completion status
    
    // ARCHIVE
    // 7. Archive project
    // 8. Verify hidden from active list
    // 9. Toggle "Show Archived" → project visible
    
    // DELETE
    // 10. Delete empty project → success
    // 11. Add objective to project
    // 12. Attempt delete → error (cannot delete non-empty)
  });
  
  test('Objective CRUD operations', async ({ page }) => {
    // Similar flow for objectives
    // Test AddObjectiveModal
    // Test brainstorm flow option
  });
});
```

**What to Test:**
- [x] `AddProjectModal.tsx` - Create project
- [x] `VisionModal.tsx` - Save vision
- [x] Project editing (name, dates, status)
- [x] Archive/unarchive toggle
- [x] Delete validation (empty projects only)
- [x] `AddObjectiveModal.tsx` - Create objective
- [x] Objective journey launch

---

#### 4. Full Journey Flows (RRGT Integration)
**Coverage Gap:** RRGT module not tested, touchbase system not tested

**Test Spec:** `tests/e2e/rrgt-touchbase.spec.ts`
```typescript
test.describe('RRGT & Touchbase System', () => {
  test('Complete RRGT item lifecycle', async ({ page }) => {
    // 1. Navigate to RRGT tab
    // 2. Add new RRGT item
    // 3. Mark as "In Progress"
    // 4. Add progress notes
    // 5. Mark as "Complete"
    // 6. Verify item appears in completed section
  });
  
  test('Weekly touchbase check-in', async ({ page }) => {
    // 1. Navigate to Scoreboard
    // 2. Click "Start Touchbase"
    // 3. Fill out touchbase form
    // 4. Submit touchbase
    // 5. Verify touchbase appears in history
    // 6. View previous touchbase
  });
});
```

**What to Test:**
- [x] `RrgtItemModal.tsx` - CRUD operations
- [x] RRGT status transitions
- [x] `NewTouchbaseModal.tsx` - Create touchbase
- [x] `ViewTouchbaseModal.tsx` - View history
- [x] Scoreboard task assignments

---

#### 5. PDF Export System
**Status:** ✅ Already well-covered
- `brainstorm-pdf.spec.ts` ✅
- `full-project-pdf.spec.ts` ✅
- `full-project-pdf-cross-session.spec.ts` ✅
- `full-project-pdf-footer.spec.ts` ✅

**Recommendation:** No additional work needed here. Excellent coverage.

---

### Test Execution Plan

**Local Testing:**
```bash
# Run all E2E tests locally
npm run test:e2e

# Run specific test file
npm run test:e2e -- tests/e2e/user-onboarding.spec.ts

# Debug with Playwright UI
npm run test:e2e -- --ui

# Generate trace for debugging
npm run test:e2e -- --trace on
```

**CI/CD Integration:**
- All PRs must pass E2E tests (chromium + webkit)
- Production deployment requires green E2E suite
- Nightly runs test full suite against production

**Playwright Trace Viewer Usage:**
```bash
# View trace from failed test
npx playwright show-trace test-results/*/trace.zip

# Interactive debugging
npx playwright test --debug
```

---

## Phase 3: Stripe Payment Integration (MONETIZATION)
**Status:** 🔴 Not Started  
**Duration:** 1-2 weeks  
**Priority:** P1 - Revenue critical

### Current State Analysis

**What's Implemented:**
- ✅ Pricing page UI (`Pricing.tsx`)
- ✅ Trial system (14-day countdown in `AuthContext.tsx`)
- ✅ Trial banner (`TrialEndingBanner.tsx`)
- ✅ Stripe SDK installed (`stripe` npm package)
- ✅ Basic checkout endpoint (`POST /api/billing/checkout` - stub)
- ⚠️ Webhook endpoint stub (`POST /api/stripe/webhook` - TODO)

**What's Missing:**
- ❌ Stripe webhook handler implementation
- ❌ Subscription status sync (Stripe → DB)
- ❌ Payment success/failure handling
- ❌ Customer portal redirect
- ❌ E2E payment flow test
- ❌ Stripe environment variables in production

---

### Implementation Roadmap

#### Step 1: Stripe Dashboard Configuration
**Reference:** `docs/STRIPE_SETUP_GUIDE.md`

**Tasks:**
1. [ ] Create Stripe account (if not exists)
2. [ ] Create product: "Project Arrowhead Teams" ($49/month)
3. [ ] Note Price ID (format: `price_xxxxxxxxxxxxx`)
4. [ ] Configure webhook endpoint: `https://project-arrowhead.pages.dev/api/stripe/webhook`
5. [ ] Select events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
6. [ ] Copy webhook signing secret
7. [ ] Copy publishable key and secret key

**Environment Variables:**
```bash
# Add to Cloudflare Pages production environment
STRIPE_SECRET_KEY=sk_live_xxxxxxxxxxxxx
STRIPE_PUBLISHABLE_KEY=pk_live_xxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
STRIPE_PRO_MONTHLY_PRICE_ID=price_xxxxxxxxxxxxx
```

---

#### Step 2: Implement Webhook Handler
**File:** `server/api/stripe/webhook.ts` (or add to `server/routes.ts`)

**Implementation:**
```typescript
import Stripe from 'stripe';
import { getDb } from '../db';
import { teams } from '../../shared/schema/teams';
import { eq } from 'drizzle-orm';

export async function handleStripeWebhook(
  event: Stripe.Event,
  stripe: Stripe
): Promise<void> {
  const db = getDb();
  
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const teamId = session.metadata?.teamId;
      
      if (!teamId) {
        console.error('No teamId in checkout session metadata');
        return;
      }
      
      // Update team subscription status
      await db
        .update(teams)
        .set({
          subscriptionStatus: 'active',
          stripeCustomerId: session.customer as string,
          stripeSubscriptionId: session.subscription as string,
        })
        .where(eq(teams.id, teamId));
      
      console.log(`✅ Subscription activated for team ${teamId}`);
      break;
    }
    
    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;
      
      // Find team by Stripe customer ID
      const teamRecords = await db
        .select()
        .from(teams)
        .where(eq(teams.stripeCustomerId, customerId))
        .limit(1);
      
      if (teamRecords.length === 0) {
        console.error(`No team found for Stripe customer ${customerId}`);
        return;
      }
      
      const team = teamRecords[0];
      
      // Update subscription status
      await db
        .update(teams)
        .set({
          subscriptionStatus: subscription.status === 'active' ? 'active' : 'inactive',
        })
        .where(eq(teams.id, team.id));
      
      console.log(`✅ Subscription updated for team ${team.id}: ${subscription.status}`);
      break;
    }
    
    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;
      
      // Find team and deactivate
      const teamRecords = await db
        .select()
        .from(teams)
        .where(eq(teams.stripeCustomerId, customerId))
        .limit(1);
      
      if (teamRecords.length > 0) {
        await db
          .update(teams)
          .set({ subscriptionStatus: 'canceled' })
          .where(eq(teams.id, teamRecords[0].id));
        
        console.log(`❌ Subscription canceled for team ${teamRecords[0].id}`);
      }
      break;
    }
    
    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId = invoice.customer as string;
      
      // Find team and mark payment failed
      const teamRecords = await db
        .select()
        .from(teams)
        .where(eq(teams.stripeCustomerId, customerId))
        .limit(1);
      
      if (teamRecords.length > 0) {
        await db
          .update(teams)
          .set({ subscriptionStatus: 'past_due' })
          .where(eq(teams.id, teamRecords[0].id));
        
        console.warn(`⚠️ Payment failed for team ${teamRecords[0].id}`);
      }
      break;
    }
  }
}
```

**Route Integration:**
```typescript
app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const stripe = getStripe();
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  
  if (!webhookSecret) {
    return res.status(500).json({ error: 'Webhook secret not configured' });
  }
  
  try {
    const event = stripe.webhooks.constructEvent(req.body, sig!, webhookSecret);
    await handleStripeWebhook(event, stripe);
    res.json({ received: true });
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    res.status(400).json({ error: 'Webhook signature verification failed' });
  }
});
```

---

#### Step 3: Update Checkout Flow
**File:** `server/routes.ts` (existing stub at line 372)

**Current Code:**
```typescript
// POST /api/billing/checkout - Create Stripe Checkout session
app.post("/api/billing/checkout", async (req, res) => {
  // ... auth logic ...
  
  const session = await stripe.checkout.sessions.create({
    customer: stripeCustomerId,
    mode: 'subscription',
    line_items: [{ price: finalPriceId, quantity: 1 }],
    success_url: `${publicSiteUrl}/dashboard/projects?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${publicSiteUrl}/pricing`,
  });
  
  return res.json({ url: session.url });
});
```

**Required Change:**
Add `metadata.teamId` to session so webhook can update correct team:
```typescript
const session = await stripe.checkout.sessions.create({
  customer: stripeCustomerId,
  mode: 'subscription',
  line_items: [{ price: finalPriceId, quantity: 1 }],
  success_url: `${publicSiteUrl}/dashboard/projects?session_id={CHECKOUT_SESSION_ID}`,
  cancel_url: `${publicSiteUrl}/pricing`,
  metadata: {
    teamId: req.userContext?.teamId,  // ← ADD THIS
    userId: req.userContext?.userId,
  },
});
```

---

#### Step 4: Frontend Checkout Integration
**File:** `client/src/pages/Pricing.tsx`

**Current Code:**
```tsx
<Button asChild>
  <Link href="/signup">Start 14-Day Free Trial</Link>
</Button>
```

**After Trial Ends:**
User should be able to click "Subscribe" button that:
1. Calls `POST /api/billing/checkout`
2. Redirects to Stripe Checkout
3. Returns to app after payment

**Implementation:**
```tsx
// Add to Pricing.tsx
async function handleSubscribe() {
  try {
    const response = await fetch('/api/billing/checkout', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session?.access_token}`,
        'Content-Type': 'application/json',
      },
    });
    
    const { url } = await response.json();
    window.location.href = url; // Redirect to Stripe
  } catch (error) {
    console.error('Checkout error:', error);
    // Show error toast
  }
}
```

---

#### Step 5: Test Payment Flow (E2E)
**Test Spec:** `tests/e2e/stripe-checkout.spec.ts`

**Note:** Stripe Checkout redirects to external domain, so E2E testing is limited.

**Approach 1: Test Up to Redirect**
```typescript
test('Initiates Stripe checkout', async ({ page }) => {
  // 1. Login as user with expired trial
  // 2. Navigate to /pricing
  // 3. Click "Subscribe Now"
  // 4. Verify redirect to stripe.com domain
  // 5. Verify URL contains checkout session ID
});
```

**Approach 2: Mock Webhook for Testing**
```typescript
test('Webhook activates subscription', async ({ page }) => {
  // 1. Create test team with 'trialing' status
  // 2. Send mock webhook event to /api/stripe/webhook
  // 3. Verify team status updated to 'active'
  // 4. Login and verify no trial banner
});
```

**Approach 3: Use Stripe Test Mode**
```bash
# Use Stripe CLI to forward webhooks locally
stripe listen --forward-to localhost:5000/api/stripe/webhook

# Trigger test events
stripe trigger checkout.session.completed
```

---

#### Step 6: Customer Portal (Manage Subscription)
**File:** `server/routes.ts` (stub at line 491)

**Implementation:**
```typescript
app.get('/api/billing/portal', async (req, res) => {
  const userId = req.userContext?.userId;
  const teamId = req.userContext?.teamId;
  
  // Get team's Stripe customer ID
  const team = await db
    .select()
    .from(teams)
    .where(eq(teams.id, teamId))
    .limit(1);
  
  if (!team[0]?.stripeCustomerId) {
    return res.status(400).json({ error: 'No active subscription' });
  }
  
  const stripe = getStripe();
  const session = await stripe.billingPortal.sessions.create({
    customer: team[0].stripeCustomerId,
    return_url: `${process.env.PUBLIC_SITE_URL}/dashboard/settings`,
  });
  
  return res.json({ url: session.url });
});
```

---

### Schema Updates Required

**File:** `shared/schema/teams.ts`

**Add Stripe Fields:**
```typescript
export const teams = pgTable('teams', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  
  // Subscription fields
  subscriptionStatus: text('subscription_status')
    .notNull()
    .default('trialing'), // 'trialing', 'active', 'past_due', 'canceled', 'inactive'
  trialEndsAt: timestamp('trial_ends_at'),
  
  // Stripe integration
  stripeCustomerId: text('stripe_customer_id'),
  stripeSubscriptionId: text('stripe_subscription_id'),
  
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});
```

**Migration:**
```bash
# Generate migration
npm run db:generate

# Apply migration
npm run db:push
```

---

### Success Metrics

**Phase 1:**
- ✅ All P0 PRs merged
- ✅ Zero production errors in objective journey
- ✅ Lock/resume endpoints fully functional

**Phase 2:**
- 🎯 80%+ E2E test coverage for critical user flows
- 🎯 All new features accompanied by E2E tests
- 🎯 CI passing consistently (no flaky tests)

**Phase 3:**
- 💰 Stripe checkout flow functional end-to-end
- 💰 Webhook handler processing all events correctly
- 💰 Trial → Paid conversion working
- 💰 First paying customer successfully subscribed

---

## Architect Calibration Guide

### Context for New Architect

**What This App Does:**
- Strategic project management for small teams (2-10 members)
- Journey-guided planning (17-step system: Brainstorm → Choose → Objectives)
- Freemium model: Free tool + $49/month Team Edition with 14-day trial

**Technology Stack:**
- **Frontend:** React 18 + TypeScript + Vite + TailwindCSS + shadcn/ui
- **Backend:** Express.js (dev) + Cloudflare Pages Functions (prod)
- **Database:** PostgreSQL + Drizzle ORM + Supabase (auth)
- **Testing:** Playwright (E2E) + Vitest (unit/integration)
- **Payments:** Stripe (partially implemented)
- **Deployment:** Cloudflare Pages + GitHub Actions CI/CD

**Key Architecture Patterns:**
1. **Hybrid Storage:** In-memory for dev, PostgreSQL for prod
2. **Express Parity:** Dev server mirrors Cloudflare Functions API structure
3. **Multi-tenant:** Teams are root isolation boundary
4. **Role-based Access:** Account Owner > Account Manager > Team Member > Project Owner
5. **Lock Mechanism:** In-memory objective locking for concurrent editing prevention

**Critical Files to Understand:**
- `/server/routes.ts` - All API endpoints
- `/shared/schema/` - Database schema (Drizzle ORM)
- `/client/src/contexts/AuthContext.tsx` - Authentication state
- `/client/src/components/objectives/ObjectiveJourneyWizard.tsx` - 17-step journey
- `/tests/e2e/` - E2E test patterns

**Common Pitfalls:**
1. **Cloudflare Functions ≠ Express** - Different request/response objects
2. **Lock Cleanup** - DELETE 404s during cleanup are expected behavior
3. **Trial Logic** - Managed by app, not Stripe
4. **Virtual Members** - Created before invitation sent
5. **UUID IDs** - All primary keys are UUIDs, not integers

**Testing Philosophy:**
- **Agentic TDD:** Write test first, implement feature, verify green
- **E2E First:** Critical paths must have Playwright coverage
- **No Mocks in E2E:** Test against real production endpoints
- **Trace-Driven Debug:** Use Playwright Trace Viewer for failures

**Current Priorities (in order):**
1. Stabilize core objective journey (PRs #156, #157)
2. Expand E2E test coverage to 80%+
3. Complete Stripe integration for paid tier
4. Monitor production errors via Sentry
5. Optimize performance (lazy loading, caching)

**Success Metrics to Track:**
- CI pass rate (target: >95%)
- Production error rate (target: <1% of requests)
- Trial → Paid conversion (target: 10-15%)
- Page load time (target: <2s)

---

## Next Actions (Priority Order)

### Immediate (Today)
1. ✅ Monitor PR #156 CI (lock test)
2. ✅ Monitor PR #157 CI (resume fix)
3. 🔄 Manual smoke test production after merge

### This Week
1. 📝 Create `user-onboarding.spec.ts` test
2. 📝 Create `team-invitations.spec.ts` test
3. 📝 Create `project-lifecycle.spec.ts` test
4. 🔐 Set up Stripe dashboard (product, webhook, keys)

### Next Week
1. 💳 Implement Stripe webhook handler
2. 💳 Update checkout flow with metadata
3. 💳 Test payment flow end-to-end
4. 📊 Deploy to production with Stripe enabled

### Ongoing
- 🤖 Run E2E tests nightly against production
- 📈 Monitor Sentry for production errors
- 🧪 Add E2E test for each new feature
- 📖 Document architectural decisions in `/docs/adr/`

---

## Resources

**Documentation:**
- `README.md` - Project overview
- `docs/STRIPE_SETUP_GUIDE.md` - Stripe configuration
- `docs/TESTING_SETUP.md` - E2E testing guide
- `tests/e2e/README.md` - Test patterns and helpers

**External:**
- Playwright Docs: https://playwright.dev
- Stripe Docs: https://stripe.com/docs
- Cloudflare Pages: https://developers.cloudflare.com/pages
- Drizzle ORM: https://orm.drizzle.team

**Tools:**
- Playwright Trace Viewer: `npx playwright show-trace trace.zip`
- Drizzle Studio: `npm run db:studio`
- Stripe CLI: `stripe listen --forward-to localhost:5000/api/stripe/webhook`
- Sentry Dashboard: https://sentry.io

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-11-18 | Cascade | Initial strategic testing and deployment plan |
