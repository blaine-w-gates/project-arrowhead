# ADR-006: Environments and Secrets Management

- Status: Accepted
- Date: 2025-10-11

## Context
We operate across local dev, CI, and production (Cloudflare Pages + Functions). Secrets and configuration must be isolated per environment with safe defaults for tests.

## Decision
- Maintain separate secrets per environment (Local, CI, Production).
- Store production secrets in the platform secret store (Cloudflare Pages project env) and never in the repo.
- Minimum required env keys:
  - `AUTH_JWT_SECRET`
  - `STRIPE_SECRET_KEY`
  - `STRIPE_WEBHOOK_SECRET`
  - `STRIPE_PRO_MONTHLY_PRICE_ID`
  - `PUBLIC_SITE_URL` (used for success/cancel URLs)
- CI E2E uses simulated webhooks (test mode) and must not call live Stripe.
- Web server commands wire `AUTH_JWT_SECRET` for tests; billing keys are not required for non-billing test suites.

## Consequences
- Secure separation of concerns and predictable deployments.
- Faster tests by avoiding live Stripe; production functionality validated via limited staging runs later.
- Clear on-boarding: developers configure only local secrets needed for their workflow.
