# Lead Magnet API: ConvertKit Integration Runbook

This document explains how the Lead Magnet Cloudflare Function integrates with ConvertKit, how to configure environment variables, and how to toggle Single vs Double Opt-In via the ConvertKit UI.

## Overview
- Function path: `website-integration/ArrowheadSolution/functions/api/lead-magnet.ts`
- Behavior:
  - Validates input and inserts the email into Supabase (idempotent on conflict)
  - If `CONVERTKIT_ENABLED=true`, best-effort subscribe to ConvertKit Form
  - If `CONVERTKIT_SEQUENCE_ID` is set, also enroll the subscriber directly into that Sequence via API (bypasses Visual Automations)
  - Always returns success to the client after Supabase insert (UX-first), while logging ConvertKit outcomes to Cloudflare logs (`ck_debug`)

## Environment Variables (Cloudflare Pages → Settings → Variables)
- `CONVERTKIT_ENABLED` (true|false) — Feature flag for ESP integration
- `CONVERTKIT_API_SECRET` — Preferred server-side credential for Form subscribe
- `CONVERTKIT_API_KEY` — Required only for direct Sequence enroll (used by `/v3/sequences/:id/subscribe`)
- `CONVERTKIT_FORM_ID` — ConvertKit Form ID to subscribe to (e.g., `8546551`)
- `CONVERTKIT_SEQUENCE_ID` — ConvertKit Sequence ID for direct enrollment (optional but recommended)
- `CONVERTKIT_BASE_URL` — Default `https://api.convertkit.com/v3`
- `CONVERTKIT_TIMEOUT_MS` — Default `4000` (1s–15s guarded)

Credential preference in code:
- The function prefers `CONVERTKIT_API_SECRET` for the Form subscribe call. If the secret is missing, it falls back to `CONVERTKIT_API_KEY`.
- The Sequence enroll call requires `CONVERTKIT_API_KEY` specifically (per API docs).

## Get IDs in ConvertKit
- Form ID: Grow → Landing Pages & Forms → open form → URL contains the numeric ID, or use the API `/v3/forms`.
- Sequence ID: Send → Sequences → open sequence → URL contains the numeric ID, or use the API `/v3/sequences`.

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
- If Visual Automations are unavailable on your plan, the function can still enroll the subscriber into a Sequence directly via API.

## Observability
- The function emits structured logs in Cloudflare: `{ "evt": "ck_debug", ... }` with `stage`, `status`, and truncated response body.
- Example success logs:
  ```json
  {"evt":"ck_debug","stage":"response","status":200,"ok":true,"url":"https://api.convertkit.com/v3/forms/8546551/subscribe","used_credential":"api_secret","body":"{...}"}
  {"evt":"ck_debug","stage":"seq_response","status":200,"ok":true,"url":"https://api.convertkit.com/v3/sequences/SEQUENCE_ID/subscribe","used_credential":"api_key","sequence_id":"SEQUENCE_ID","body":"{...}"}
  ```
- Use these logs to diagnose 401/404/422 responses.

## E2E Testing Hook
- You can override `CONVERTKIT_BASE_URL` to point at a mock during E2E to avoid hitting the real API.

## Failure Semantics & Retry
- If ConvertKit is down or returns non-2xx, the client still sees success. The failure is logged (`ck_debug`).
- Optional future hardening: add a `needs_sync=true` flag to Supabase and an admin-triggered retry flow.
