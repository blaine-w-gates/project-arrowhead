# Product Requirements Document: Paid MVP (v4.2 Draft)

- Version: 4.2 Draft
- Date: 2025-10-11
- Status: Draft – For Review and Implementation
- Supersedes: PRD v4.1 where noted (adds Paid MVP scope)

---

## 1. Scope
Deliver a minimal, production-ready Paid MVP that enables users to purchase a Pro subscription and access premium features via a protected Account page. Teams are out of scope for the MVP.

---

## 2. User Journey
1) Visitor uses the free app and encounters an upsell point
2) Clicks Pricing → chooses Pro plan → enters auth flow: `/signin` → `/verify`
3) After auth, proceeds to checkout (Stripe Checkout)
4) On successful payment, returns to `/account` where plan and status are displayed
5) User can manage billing (Stripe Billing Portal) or sign out

---

## 3. Pages & UX
- `/signin` and `/verify`: already implemented (OTP passwordless)
- `/account` (new):
  - Protected route (requires `sb_session`)
  - Shows: email, plan, status (`active`, `trialing`, `past_due`, `canceled`, `unpaid`)
  - Primary actions:
    - “Manage billing” → POST `/api/billing/portal` → redirect URL
    - “Sign out” → POST `/api/auth/logout` → clears cookie and redirects to `/`
  - Empty state (no subscription): prompt to upgrade → POST `/api/billing/checkout`

---

## 4. API & Contracts
- `POST /api/auth/request` → issue OTP (existing)
- `POST /api/auth/verify` → set `sb_session` cookie (existing)
- `POST /api/auth/logout` → clear cookie
- `GET  /api/me` → `{ id, email, plan, status, isPro }`
- `POST /api/billing/checkout` → `{ url }` for Stripe Checkout session
- `POST /api/billing/portal` → `{ url }` for Stripe Billing Portal session
- `POST /api/stripe/webhook` (prod Functions; Express mirror for dev) → updates subscription state

Notes:
- Cookie: `sb_session` (JWT), HttpOnly, Secure (prod), SameSite=Lax
- Entitlements: `isPro = status ∈ { active, trialing, past_due }`

---

## 5. Data Model (MVP Additions)
- `user_subscriptions`:
  - `userId` (FK users.id)
  - `stripeCustomerId` (text)
  - `stripeSubscriptionId` (text)
  - `plan` (text; e.g., `pro_monthly`)
  - `status` (text)
  - `currentPeriodEnd` (timestamptz)
  - `createdAt`, `updatedAt` (timestamptz)
- Optional: `billing_events` for webhook idempotency (`eventId` unique)

---

## 6. Billing & Webhooks
- Provider: Stripe
- Purchase: Stripe Checkout (hosted)
- Management: Stripe Billing Portal
- Webhooks handled:
  - `checkout.session.completed`
  - `customer.subscription.created|updated|deleted`
  - `invoice.payment_succeeded|failed`
- Security: verify `Stripe-Signature` with `STRIPE_WEBHOOK_SECRET`; de-dupe by `event.id`; apply updates in `created` order per subscription.

---

## 7. Environment Variables
- `AUTH_JWT_SECRET`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRO_MONTHLY_PRICE_ID`
- `PUBLIC_SITE_URL` (for success/cancel URLs)

---

## 8. Acceptance Criteria
- Auth: `/signin` → `/verify` issues a valid `sb_session`; cookie is asserted in E2E
- `/account` requires auth; unauthenticated requests redirect to `/signin`
- Pro purchase via Checkout updates DB via webhook; `/account` reflects `plan` and `status`
- Manage billing opens Stripe Billing Portal
- Logout clears cookie and redirects
- E2E tests pass locally and in CI with webhook simulation (no live Stripe)

---

## 9. Out of Scope (MVP)
- Teams and roles
- Multi-tier plans
- Free→Paid migration of local browser data
- Dunning emails and advanced retry strategy

---

## 10. References
- `docs/Auth_Strategy_vNext.md`
- ADRs: `docs/adr/ADR-001` … `ADR-006`
- `SLAD_v5.2_Final.md` (to be updated post-implementation)
