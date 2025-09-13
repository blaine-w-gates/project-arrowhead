# Lead Magnet API: ConvertKit Integration Runbook

This document explains how the Lead Magnet Cloudflare Function integrates with ConvertKit, how to configure environment variables, and how to toggle Single vs Double Opt-In via the ConvertKit UI.

## Overview
- Function path: `website-integration/ArrowheadSolution/functions/api/lead-magnet.ts`
- Behavior:
  - Validates input and inserts the email into Supabase (idempotent on conflict)
  - If `CONVERTKIT_ENABLED=true`, best-effort subscribe to ConvertKit Form
  - Always returns success to the client after Supabase insert (UX-first), while logging ConvertKit outcomes to Cloudflare logs (`ck_debug`)

## Environment Variables (Cloudflare Pages → Settings → Variables)
- `CONVERTKIT_ENABLED` (true|false) — Feature flag for ESP integration
- `CONVERTKIT_API_SECRET` — Preferred server-side credential
- `CONVERTKIT_API_KEY` — Optional; only used if `CONVERTKIT_API_SECRET` is not set
- `CONVERTKIT_FORM_ID` — ConvertKit Form ID to subscribe to (e.g., `8546551`)
- `CONVERTKIT_BASE_URL` — Default `https://api.convertkit.com/v3`
- `CONVERTKIT_TIMEOUT_MS` — Default `4000` (1s–15s guarded)

Credential preference in code:
- The function now prefers `CONVERTKIT_API_SECRET` when both secret and key are present. If the secret is missing, it falls back to `CONVERTKIT_API_KEY`.
- Recommended: set only `CONVERTKIT_API_SECRET` to avoid ambiguity.

## ConvertKit: Single vs Double Opt-In
Single/Double Opt-In is controlled in ConvertKit Form settings. The API request does not need to include any opt-in flag.

Steps to enable Single Opt-In (auto-confirm subscribers):
1. Log in to ConvertKit.
2. Navigate to: Grow → Landing Pages & Forms → select the form (ID `8546551`).
3. Click `Settings` → `Incentive`.
4. Uncheck `Send incentive email`.
5. Save.

Notes:
- With incentive email disabled, subscribers are auto-confirmed (single opt-in). Deliverability best practices (SPF/DKIM/DMARC) are important.
- Ensure an Automation rule enrolls new Form subscribers into the "Endeavour Cycle" sequence, and that the sequence is published.

## Observability
- The function emits structured logs in Cloudflare: `{ "evt": "ck_debug", ... }` with `stage`, `status`, and truncated response body.
- Example success log:
  ```json
  {"evt":"ck_debug","stage":"response","status":201,"ok":true,"url":"https://api.convertkit.com/v3/forms/8546551/subscribe","used_credential":"api_secret","body":"{...}"}
  ```
- Use these logs to diagnose 401/404/422 responses.

## E2E Testing Hook
- You can override `CONVERTKIT_BASE_URL` to point at a mock during E2E to avoid hitting the real API.

## Failure Semantics & Retry
- If ConvertKit is down or returns non-2xx, the client still sees success. The failure is logged (`ck_debug`).
- Optional future hardening: add a `needs_sync=true` flag to Supabase and an admin-triggered retry flow.
