# ADR-005: Stripe Webhook Security and Idempotency

- Status: Accepted
- Date: 2025-10-11

## Context
Stripe webhooks notify us of subscription lifecycle events. Handlers must be secure and idempotent to avoid duplicate updates and race conditions.

## Decision
- Verify webhooks using Stripe's signature header (`Stripe-Signature`) and the environment secret `STRIPE_WEBHOOK_SECRET`.
- Parse the event only after verification; reject unverified requests with `400`.
- De-duplicate by persisting processed `event.id` (or a hash) in a `billing_events` table with a unique index.
- Apply updates in event `created` time order per subscription id; use DB transactions.
- Handle at least: `checkout.session.completed`, `customer.subscription.created|updated|deleted`, `invoice.payment_succeeded|failed`.
- Production endpoint served by Cloudflare Function `/api/stripe/webhook`; Express mirror for local dev.

## Consequences
- Prevents double-processing on retries.
- Ensures consistent subscription state even with out-of-order delivery.
- Clear blast radius in case of handler errors; failures are observable and recoverable.
