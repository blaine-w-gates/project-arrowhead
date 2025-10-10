# ADR-001: Billing Provider and Flows

- Status: Accepted
- Date: 2025-10-11

## Context
We need a simple, secure, and scalable paid MVP. Stripe provides hosted Checkout and a Billing Portal that minimize PCI scope and accelerate launch.

## Decision
- Use Stripe as the billing provider.
- Use Stripe Checkout for purchase flow of a single product/price (Pro Monthly).
- Use Stripe Billing Portal for customer self-service (update payment method, cancel, invoices).
- Manage the price ID via env: `STRIPE_PRO_MONTHLY_PRICE_ID`.
- Server creates sessions and returns URLs from endpoints.

## Consequences
- Faster time to market; hosted UI for PCI-sensitive flows.
- Webhooks are required to keep subscription state in sync.
- Minimal local data model captures subscription status; entitlements computed in code.
