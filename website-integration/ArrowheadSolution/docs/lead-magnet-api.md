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
