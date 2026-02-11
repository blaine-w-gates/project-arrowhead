# Lead Magnet API

This document describes the Cloudflare Pages Function that powers the Lead Magnet backend.

- Function file: `functions/api/lead-magnet.ts`
- Public endpoint (prod): `https://project-arrowhead.pages.dev/api/lead-magnet`

## Methods

- POST: Accepts a JSON payload and inserts an email into the `leads` table in Supabase.
- OPTIONS: CORS preflight, always responds 204. CORS headers reflect allowed origin if present.
- HEAD: Lightweight health/CORS check, responds 204 or 200 (Cloudflare variance) with CORS headers.

## CORS

Only requests from allowed origins are served.
- Allowed sources are assembled from:
  - `PUBLIC_SITE_URL` (exact origin)
  - `ALLOWED_ORIGINS` (comma-separated list of origins)
  - Dev defaults: `http://localhost:5173`, `http://127.0.0.1:5173`

If the Origin header is missing or not in the allowlist, the API returns 403 with:
```json
{ "success": false, "error": "Origin not allowed" }
```

## Request

- Content-Type: `application/json`
- Body:
```json
{ "email": "user@example.com" }
```

Requirements:
- Valid email format (length 5–320, simple regex validation)
 - Content-Type must be `application/json`
 - Max payload size: 2 KB

## Responses

- 200 OK (new or duplicate email):
```json
{ "success": true, "message": "Thanks! You're on the list." }
```
  - Duplicates are treated as success to avoid leaking existence (`Prefer: return=minimal,resolution=ignore-duplicates` + `on_conflict=email`).

- 400 Bad Request (invalid email / bad JSON):
```json
{ "success": false, "error": "Invalid email" }
```

- 413 Payload Too Large (JSON exceeds max size):
```json
{ "success": false, "error": "Payload too large" }
```

- 415 Unsupported Media Type (missing/incorrect Content-Type):
```json
{ "success": false, "error": "Content-Type must be application/json" }
```

- 403 Forbidden (CORS disallowed):
```json
{ "success": false, "error": "Origin not allowed" }
```

- 500 Internal Server Error (missing configuration / unexpected):
```json
{ "success": false, "error": "Server not configured" }
```

- 502 Bad Gateway (Supabase REST error):
```json
{ "success": false, "error": "Upstream error", "detail": "<truncated upstream text>" }
```

## Environment variables

- `SUPABASE_URL` (required)
- `SUPABASE_SERVICE_ROLE` (preferred) or `SUPABASE_ANON_KEY` (fallback)
- `PUBLIC_SITE_URL` (required for proper CORS in prod)
- `ALLOWED_ORIGINS` (optional, comma-separated)
- `SUPABASE_LEADS_TABLE` (optional, default: `leads`)
 - `TURNSTILE_SECRET_KEY` (optional; enable Cloudflare Turnstile verification)
 - `TURNSTILE_REQUIRED` (optional; set to `true` to enforce Turnstile)

### ESP integrations (feature flags)

This function supports ESP calls as a best-effort step after the Supabase insert. These calls never affect the user-facing success response.

- `MAILERLITE_ENABLED` (true|false)
  - When `true`, the function will POST to MailerLite to add the email to a group.
- `MAILERLITE_API_KEY` (secret)
  - Bearer token for MailerLite API.
- `MAILERLITE_GROUP_ID` (plaintext)
  - Numeric group ID for the onboarding sequence (e.g., "Endeavour Cycle").
- `MAILERLITE_BASE_URL` (optional, default `https://connect.mailerlite.com/api`)
- `MAILERLITE_TIMEOUT_MS` (optional, default `4000`, clamped 1000–15000)

Optional diagnostics:

- `MAILERLITE_DIAG_VERIFY` (optional, default `false`)
  - When `true`, after a successful MailerLite POST (2xx), the function performs a quick GET to `GET /subscribers/{id}` to confirm presence and logs a concise `ml_debug` entry with `stage="verify"`.
  - The verification shares the same timeout window as the POST and is best‑effort (it never affects the client response).
  - Recommended policy: keep `MAILERLITE_DIAG_VERIFY=true` in Preview, and enable it in Production only during short observation windows (e.g., 24–48 hours) to reduce extra API calls.

Notes:
- Set `CONVERTKIT_ENABLED=false` while using MailerLite to avoid double calls.
- ConvertKit integration has been archived for future use; see `docs/convertkit-handoff.md`.

### Frontend (Vite)

- `VITE_TURNSTILE_SITE_KEY` (optional)
  - When set, the UI renders a Turnstile widget and passes the token in the request body as both `turnstileToken` and `cf-turnstile-response`.
  - If `TURNSTILE_REQUIRED=true` on the server and this is not set or the token is missing/invalid, the API will return `400` with `{ success: false, error: "Captcha required" }`.

## Supabase table

A minimal schema example:
```sql
create table if not exists public.leads (
  id bigserial primary key,
  email text not null unique,
  created_at timestamptz not null default now()
);
```

RLS is not required when using the service role key.

## Optional: Cloudflare Turnstile (bot protection)

If `TURNSTILE_SECRET_KEY` is set and `TURNSTILE_REQUIRED=true`, the API will verify a Turnstile token.

Frontend must include one of the following fields in the JSON body:
```json
{ "email": "user@example.com", "turnstileToken": "<token>" }
```
or
```json
{ "email": "user@example.com", "cf-turnstile-response": "<token>" }
```

A missing/invalid token yields:
```json
{ "success": false, "error": "Captcha required" }
```
or
```json
{ "success": false, "error": "Captcha verification failed" }
```

## Running prod E2E tests

Playwright configuration supports a prod project and skipping the local dev server.

- Install browsers (first time):
```
npm run test:install
```
- Run only the Lead Magnet prod tests:
```
npm run test:prod:e2e:lead
```

Tests cover:
- Allowed-origin success (200, success: true)
- Duplicate submission treated as success (200, success: true)
- Missing origin rejected (403, success: false)
- Invalid email rejected (400, success: false)
- HEAD health (200 or 204)

## Troubleshooting

- 403 Origin not allowed: ensure `PUBLIC_SITE_URL`/`ALLOWED_ORIGINS` include your site origin exactly (scheme + host, no trailing slash).
- 400 Invalid email: ensure valid email format and JSON body `{ "email": "..." }`.
- 502 Upstream error: check Supabase credentials, REST URL, and table name. Cloudflare Pages logs will include more details.
- CORS headers: Preflight OPTIONS and HEAD responses include appropriate CORS headers; make sure requests include `Origin` and `Content-Type: application/json` when required.

## Observability (ESP calls)

The function emits structured JSON logs to Cloudflare Pages Functions logs. These logs are best-effort and do not change client responses.

MailerLite examples:
```
{ "evt":"ml_debug", "stage":"response", "status":200, "ok":true, "url":"https://connect.mailerlite.com/api/subscribers", "group_id":"<id>", "body":"<truncated>" }
{ "evt":"ml_debug", "stage":"timeout", "message":"The operation was aborted" }
{ "evt":"ml_debug", "stage":"error", "message":"<reason>" }
{ "evt":"ml_debug", "stage":"skip", "reason":"missing_config", "api_key_present":true, "group_id_present":false }
{ "evt":"ml_debug", "stage":"disabled" }
{ "evt":"ml_debug", "stage":"wrapper_catch", "message":"<error>" }
```

When diagnostics are enabled, logs include a non‑PII email hash and a verify stage:

```
{ "evt":"ml_debug", "stage":"response", "status":201, "ok":true, "url":"https://connect.mailerlite.com/api/subscribers", "group_id":"<id>", "body":"{...}", "email_hash":"62acd6e8d6" }
{ "evt":"ml_debug", "stage":"verify",   "status":200, "ok":true,  "id_trunc":"165687378751", "body":"{...}",       "email_hash":"62acd6e8d6" }
```

Notes:
- `email_hash` is the first 10 hex chars of `sha256(email)`, used only for correlating related log lines. It does not expose the email.
- `stage="verify"` appears only when `MAILERLITE_DIAG_VERIFY=true` and the POST returned a subscriber `id` promptly. Its absence is not an error.
- If `verify` regularly times out, consider increasing `MAILERLITE_TIMEOUT_MS` slightly (e.g., 6000–8000). Keep in mind all ESP work is best‑effort and never affects client responses.

Interpretation:
- `response` indicates a MailerLite HTTP response (200/201 expected on success).
- `timeout` indicates the request exceeded `MAILERLITE_TIMEOUT_MS` and was aborted.
- `error` indicates a network or fetch error.
- `skip` logs when required configuration is missing.
- `disabled` logs when `MAILERLITE_ENABLED` is not `true`.
