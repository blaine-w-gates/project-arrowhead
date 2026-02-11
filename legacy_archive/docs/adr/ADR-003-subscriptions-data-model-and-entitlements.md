# ADR-003: Subscriptions Data Model and Entitlements

- Status: Accepted
- Date: 2025-10-11

## Context
We need a minimal local source of truth for subscription state to render plan information and gate features. Stripe remains the authority; our DB mirrors the latest status via webhooks.

## Decision
- Create table `user_subscriptions` with fields:
  - `userId` (int, FK users.id)
  - `stripeCustomerId` (text)
  - `stripeSubscriptionId` (text)
  - `plan` (text; e.g., `pro_monthly`)
  - `status` (text; Stripe status snapshot)
  - `currentPeriodEnd` (timestamptz)
  - `createdAt`, `updatedAt` (timestamptz)
- Compute entitlements server-side:
  - `isPro = status ∈ { active, trialing, past_due }`
  - Access revoked for `canceled`, `unpaid`, or when subscription missing.

## Consequences
- Client calls `GET /api/me` to receive `{ email, plan, status, isPro }`.
- Future team/enterprise plans can extend with an `accounts` table without breaking this contract.
