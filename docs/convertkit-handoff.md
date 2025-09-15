# ConvertKit Handoff (Archive)

This document freezes the current state of our ConvertKit integration, so we can resume it later without re-discovery. The code remains in place and production-ready; the only blocker to completing the onboarding flow within ConvertKit is the free plan’s lack of Sequences.

## Final State Summary
- Backend path: `website-integration/ArrowheadSolution/functions/api/lead-magnet.ts`.
- Status: Technical integration is complete and validated.
  - CORS policy covers preview and production Pages subdomains and localhost.
  - Supabase insertion is idempotent (`on_conflict=email`) and returns success-first UX.
  - ConvertKit Form subscribe call works (ck_debug `stage":"response"` with 200/201 from `POST /v3/forms/:id/subscribe`).
  - Code also supports direct Sequence enrollment via API (`POST /v3/sequences/:id/subscribe`) behind `CONVERTKIT_SEQUENCE_ID`—this requires a Sequence to exist.
- Blocker: The ConvertKit free plan cannot create Sequences (UI paywalled; API lists none). Without an existing Sequence ID, the function logs `{"evt":"ck_debug","stage":"seq_skip","reason":"missing_sequence_id"}` and skips direct Sequence enrollment.
- Opt-in model: Single/Double Opt-In is controlled in the ConvertKit Form UI (Settings → Incentive). The request body does not need a `double_opt_in` flag.

## Reference PR
- Final working PR (code + runbook): https://github.com/blaine-w-gates/project-arrowhead/pull/41

## Required Environment Variables (ConvertKit)
Set these in Cloudflare Pages → Settings → Variables.

- `CONVERTKIT_ENABLED` (true|false)
  - Feature flag to enable ConvertKit calls after Supabase insert.
- `CONVERTKIT_API_SECRET` (secret)
  - Preferred credential for `POST /v3/forms/:id/subscribe`.
- `CONVERTKIT_API_KEY` (plaintext)
  - Fallback for the Form call if secret is absent; required for `POST /v3/sequences/:id/subscribe`.
- `CONVERTKIT_FORM_ID` (plaintext)
  - Numeric Form ID (e.g., `8546551`).
- `CONVERTKIT_SEQUENCE_ID` (plaintext, optional)
  - Numeric Sequence ID for direct enrollment. Only works if a Sequence exists on the account.
- `CONVERTKIT_BASE_URL` (plaintext, optional)
  - Default: `https://api.convertkit.com/v3`.
- `CONVERTKIT_TIMEOUT_MS` (plaintext, optional)
  - Default: `4000` (guarded to 1s–15s).

Notes:
- Preview and Production environments have separate variable sets.
- `CONVERTKIT_DOUBLE_OPT_IN` is not used by the current code (opt-in is set in the Form UI).

## Observability
- Structured logs via Cloudflare (`console.log` JSON):
  - Form subscribe: `{ "evt":"ck_debug","stage":"response", "status":200/201, "used_credential":"api_secret|api_key", "url":"/v3/forms/:id/subscribe", "body":"…" }`.
  - Sequence enroll: `{ "evt":"ck_debug","stage":"seq_response", "status":200, "used_credential":"api_key", "sequence_id":"…", "body":"…" }`.
  - Skips and errors: `stage":"skip|seq_skip|error|timeout|seq_error|seq_timeout|wrapper_catch"`.

## How to Resume Later
- Upgrade ConvertKit to unlock Sequences.
- Create and publish the "Endeavour Cycle" sequence (Email 1: send immediately).
- Capture the numeric Sequence ID and set `CONVERTKIT_SEQUENCE_ID` in Cloudflare (Preview → Production).
- Redeploy; expect `ck_debug` with `stage":"seq_response", status: 200` and the welcome email to send.

## Security Note
- Since credentials were shared during investigation, rotate the ConvertKit API secret when you resume. Remove any unused variables (e.g., `CONVERTKIT_DOUBLE_OPT_IN`).
