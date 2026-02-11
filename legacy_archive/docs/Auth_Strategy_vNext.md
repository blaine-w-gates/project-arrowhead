# Auth Strategy vNext

Version: 1.0
Date: 2025-10-10
Status: Draft – For Implementation

---

## 1. Objectives
- Primary: Passwordless email sign-in (OTP and/or magic link) for end-users.
- Secondary: Optional MFA (TOTP initially; WebAuthn/passkeys in a later phase).
- Session hardening, CSRF protections, and rate limits.
- Keep production `/admin/*` protected by Cloudflare Access; dynamic AdminJS remains on Node/Express for local/dev or non-static environments.

---

## 2. Architecture Overview

- Public site: Cloudflare Pages (static) with Functions for production APIs.
- API surface:
  - Production: Cloudflare Pages Functions under `website-integration/ArrowheadSolution/functions/api/auth/*`.
  - Local dev: Express routes under `website-integration/ArrowheadSolution/server/routes/auth.ts` (mirror of Functions) and middleware in `server/app.ts`.
- Persistence: PostgreSQL via Drizzle.
- Admin (unchanged for prod):
  - Static `/admin` shell (Pages) behind Cloudflare Access. See `docs/cloudflare-access-runbook.md`.
  - Dynamic AdminJS local server routes remain in `server/admin/index.ts` for dev; verify CF Access JWT if traffic is ever proxied through Workers to Node.

---

## 3. Data Model (Drizzle)
New tables; names are indicative, adjust to house style:

1) `auth_otp`
- id (serial PK)
- user_id (int, FK users.id, nullable for pre-signup verification)
- email (text, indexed)
- code_hash (text) – store bcrypt/argon2 hash of 6–8 digit code
- token (text, optional) – opaque one-time magic-link token (random 32–48 bytes)
- purpose (text enum: 'login'|'verify_email'|'reset')
- attempts (int, default 0)
- max_attempts (int, default 5)
- expires_at (timestamptz)
- created_at (timestamptz default now())
- ip (inet), user_agent (text)

2) `auth_totp`
- user_id (int PK)
- secret_enc (text) – encrypted secret (AES-GCM with key from KMS/env)
- confirmed_at (timestamptz)
- backup_codes_hash (text[]) – hashed backup codes
- created_at/updated_at (timestamptz)

3) `auth_events`
- id (serial PK)
- user_id (int, nullable for pre-auth events)
- type (text) – 'otp_issued'|'otp_verified'|'login'|'logout'|'mfa_enrolled'|'mfa_verified'|'rate_limited'|'failed_attempt'
- metadata (jsonb) – ip, ua, method, reason
- created_at (timestamptz default now())

4) (For JWT sessions) `user_sessions` (optional but recommended for audit/revocation)
- id (serial PK)
- user_id (int)
- session_id (text, random) – correlates with JWT jti
- created_at/last_seen_at (timestamptz)
- revoked_at (timestamptz, nullable)
- ip, user_agent (text)

Notes:
- Admin sessions continue using `connect-pg-simple` as configured in `server/admin/auth.ts`.
- For end-user sessions via Functions, prefer stateless JWT cookies plus `user_sessions` for minimal state + revocation.

---

## 4. Endpoints

All endpoints exist in both environments:
- Prod (Functions): `functions/api/auth/*.ts`
- Dev (Express): `server/routes/auth.ts`

Base paths:
- POST `/api/auth/request` – issue OTP code and/or magic link
- POST `/api/auth/verify` – verify submitted code or token
- POST `/api/auth/totp/enroll` – provision secret + QR (requires logged-in session)
- POST `/api/auth/totp/confirm` – confirm TOTP with first code
- POST `/api/auth/totp/verify` – verify TOTP during login if enabled
- POST `/api/auth/logout` – clear cookie/mark session revoked
- GET `/api/me` – return current user (requires auth)
- POST `/api/session/refresh` – rotate JWT; optional

Recommended behaviors:
- Request: accept `{ email, delivery: 'code'|'link'|'both' }` and optional Turnstile token. Enforce rate limits per IP + email (e.g., 5/min, 20/hr). Log `auth_events`.
- Verify: accept `{ email, code }` OR `{ token }`. On success, create JWT cookie and rotate session ID; if MFA enabled, transition to MFA step.
- Logout: for JWT, set cookie to empty with immediate expiry; mark `user_sessions.revoked_at` if stored.

---

## 5. Session Model

- End-user (Functions): Signed JWT in HttpOnly Secure SameSite=Lax cookie (e.g., `sb_session`). Include `sub` (user id), `jti` (session id), `iat`, `exp` (e.g., 7 days). Rotate `jti` on each refresh/verify success.
- Admin (Node): Continue using `express-session` with `connect-pg-simple`. Ensure `secure: true` in production, `httpOnly: true`, `sameSite: 'lax'`, and session rotation on login.

JWT Signing Keys:
- Store HMAC secret or asymmetric keys in Pages secrets.
- Rotate annually or per incident; support dual-key validation window.

---

## 6. Security Controls

- OTP handling
  - Hash codes with bcrypt/argon2; never store plaintext.
  - TTL: 10 minutes default; single-use; cap attempts (5) with exponential backoff.
  - Magic links: random token (>= 32 bytes), single use, short TTL (15–20 min).
- CSRF
  - Endpoints are JSON; prefer SameSite=Lax cookies + verify `Origin`/`Referer` and `Content-Type: application/json`.
  - For form-based endpoints (if any), implement double-submit token.
- Rate Limiting
  - Express: `rate-limiter-flexible` keyed by IP and email.
  - Functions: implement KV/DO-backed counters or use Cloudflare Turnstile to gate requests when abuse detected.
- Secrets & Encryption
  - TOTP secret encrypted at rest; backup codes hashed (bcrypt).
  - JWT secret in Pages secrets; email provider keys in secrets.
- Auditing
  - Record significant auth events into `auth_events`.
- Logging
  - No PII in logs beyond necessary metadata; hash emails where possible in diagnostic logs.

---

## 7. Email Delivery

- Abstracted mailer service with provider-agnostic interface (e.g., SendGrid/Resend/SES). Keep keys in env.
- Templates:
  - OTP email: includes device, IP, location hint; do not echo code in server logs.
  - Magic link: single-use link with token; include fallback code entry path.
- Anti-abuse: throttle per IP/email; include unrecognized device notice.

---

## 8. Cloudflare Access (Admin)

- Production `/admin/*` remains behind Cloudflare Access; see `docs/cloudflare-access-runbook.md`.
- For any server-side admin routes (if proxied through Workers), validate Access JWT in `server/app.ts` middleware and deny if invalid.
- Do not merge end-user auth with AdminJS auth; scopes and posture differ.

---

## 9. Client UX (End-User)

- Pages:
  - `/signin` – Request email code/link.
  - `/verify` – Enter code (6–8 digits) or auto-handle magic link.
  - `/mfa` – TOTP verify when enabled.
  - `/account/security` – Enroll/disable TOTP, view backup codes.
- States: loading, success, error, rate-limited; progressive disclosure.
- Accessibility: form labels, error summaries, keyboard navigation.

---

## 10. Testing & CI

- Unit
  - OTP generation, hashing, TTL/attempt logic, TOTP validation, JWT utils.
- Integration
  - Request/verify/logout flows; rate-limit boundaries; CSRF headers.
- E2E (Playwright)
  - Happy path: request → verify → session cookie → `/me`.
  - MFA: enroll → confirm → login with TOTP.
  - Abuse: invalid/expired code; exceeding attempts; link replay; CSRF/origin failures.
- CI
  - Add jobs for unit + integration on every PR; selective E2E on PR + nightly full run.

---

## 11. Migration Plan (Drizzle)

- Create migrations for `auth_otp`, `auth_totp`, `auth_events`, and optional `user_sessions`.
- Add drizzle schema in `shared/schema.ts` and zod validators.
- Backfill not needed; tables are new.

---

## 12. Environment Variables (New)

- `AUTH_JWT_SECRET` (or `AUTH_JWT_PRIVATE_KEY`/`AUTH_JWT_PUBLIC_KEY` for RSA)
- `EMAIL_FROM`, `EMAIL_PROVIDER`, `EMAIL_API_KEY` (provider-specific)
- `TURNSTILE_REQUIRED`, `TURNSTILE_SECRET_KEY` (optional)
- `AUTH_OTP_TTL_MINUTES` (default 10), `AUTH_CODE_LENGTH` (default 6)

Admin (existing): `ADMIN_SESSION_SECRET`, `ADMIN_COOKIE_SECRET`, `DATABASE_URL`.

---

## 13. Rollout Strategy

- Feature flag new auth endpoints (Functions) to internal emails first.
- Observability: aggregate `auth_events` and error rates; basic dashboard for OTP success/abuse detection.
- Cutover: public release after stability window (24–72h) and test coverage baseline met.

---

## 14. Out of Scope (Phase 2+)

- WebAuthn/passkeys (platform authenticators)
- Social login (OAuth providers)
- Email change flows and device management UI

---

## 15. References

- AdminJS setup: `website-integration/ArrowheadSolution/server/admin/index.ts`
- Admin auth/session: `website-integration/ArrowheadSolution/server/admin/auth.ts`
- Cloudflare Access: `website-integration/ArrowheadSolution/docs/cloudflare-access-runbook.md`
- Production env: `PRODUCTION_ENV_SETUP.md`
- Testing: `TESTING_STRATEGY.md`, `Sprint_2_Testing_Plan.md`
