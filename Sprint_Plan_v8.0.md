# Sprint Plan v8.0: Operation: Passwordless Auth

Version: 8.0  
Date: 2025-10-10  
Epic: Auth Strategy vNext — Passwordless email sign-in + optional MFA  
Status: Active (This Sprint)

---

## 1) Sprint Objective
Deliver a production-ready passwordless email authentication flow (OTP and/or magic link) with secure sessions, rate limiting, CSRF protections, and observability. Ship behind a feature flag and validate via automated tests and a small internal rollout.

---

## 2) Grounding & Dependencies
- Architecture: React + Express + Cloudflare Pages Functions; Postgres via Drizzle. See `SLAD_v5.2_Final.md`.
- Admin Panel: Production `/admin/*` remains static and protected by Cloudflare Access (`docs/cloudflare-access-runbook.md`). Dynamic AdminJS stays in Node for dev.
- New Auth Doc: `docs/Auth_Strategy_vNext.md` (this sprint implements PR1–PR5 scope).
- Environment: `DATABASE_URL` required; new auth secrets (JWT/email) configured per `PRODUCTION_ENV_SETUP.md`.
- Email Provider: Choose between SendGrid/Resend/SES; abstracted mailer interface.

Risks:
- Email deliverability in early rollout; mitigate with internal allowlist and robust logs.
- Abuse/rate limits correctness on Functions and Express mirrors.

---

## 3) Organized & Prioritized Backlog (with Estimates)
| Priority | Size | Task |
|----------|------|------|
| Critical | Medium | PR1: Finalize `docs/Auth_Strategy_vNext.md` (sequence diagrams, configs) |
| Critical | Medium | PR2: Drizzle migrations: `auth_otp`, `auth_totp`, `auth_events`, `user_sessions` |
| Critical | Large | PR3: Endpoints (request/verify/logout) in Functions + Express mirror, JWT cookie, CSRF/origin checks, rate limiting |
| Critical | Medium | PR4: Minimal UI pages (`/signin`, `/verify`, `/mfa`) with accessible forms |
| Critical | Medium | PR5: Tests — unit (OTP/JWT), integration (auth flows), E2E (happy + MFA gate), CI wiring |
| High | Small | Observability: `auth_events` dashboard stub + structured logs |
| High | Small | Feature flag & internal allowlist for rollout |
| Medium | Small | Docs: runbooks for OTP support + incident checklist |

Notes:
- Magic link token optional in v8.0. If time-constrained, ship OTP-first with link as stretch.

---

## 4) Sprint Breakdown (Execution Plan)

### Phase A — Schema & Contracts (Day 1–1.5)
- Create Drizzle schemas and migrations for `auth_otp`, `auth_totp`, `auth_events`, `user_sessions`.
- Add zod validators in `shared/schema.ts`.
- Decide email provider and add mailer abstraction.

### Phase B — Core Flows (Day 2–3)
- Implement `POST /api/auth/request` (issue OTP and/or magic link) with rate limits.
- Implement `POST /api/auth/verify` (verify code/token) → set HttpOnly Secure JWT cookie; rotate session (`jti`).
- Implement `POST /api/auth/logout` (clear cookie, revoke session).
- Mirror endpoints in Express for dev parity.

### Phase C — UI & Security (Day 3–4)
- Build minimal `/signin`, `/verify`, `/mfa` pages with accessible forms and error states.
- Enforce CSRF/origin checks (JSON + SameSite=Lax; origin validation).

### Phase D — Testing & Rollout (Day 4–5)
- Unit tests (OTP hashing/TTL/attempts, JWT utils, TOTP verify).
- Integration tests (request/verify/logout; rate-limit boundaries; CSRF).
- Playwright E2E happy path (OTP) + MFA-gated path (when enabled).
- Feature-flag internal allowlist rollout; verify metrics and logs.

---

## 5) Deliverables
- New migrations applied; tables present and indexed.
- Auth endpoints live (Functions) with Express mirrors for local dev.
- JWT session cookies configured and rotating; logout works.
- Minimal, accessible auth UI.
- Automated tests passing in CI (unit, integration, E2E subset on PR; nightly full).
- Basic auth observability: `auth_events` recorded and queryable.

---

## 6) Acceptance Criteria
- Requesting a code for an allowed internal email produces a deliverable OTP; verification logs `otp_verified` and issues a valid session cookie.
- Invalid or expired code yields 400/401 and increments attempts with backoff; exceeds attempts → rate-limited.
- CSRF/origin checks enforced; JSON-only.
- Sessions rotate on verify and refresh; logout revokes session.
- E2E: Happy path passes locally and in CI; flaky rate <1%.

---

## 7) Definition of Done (DoD)
- CI green on unit/integration; E2E core specs passing.
- Security checklist: cookie flags, CSRF/origin checks, OTP hashing, secret storage.
- Runbooks added for OTP support and incident handling.
- Feature-flagged internal rollout completed without P0 defects.

---

## 8) Timeline & Capacity
- Estimated: 5 working days.
- Buffer: +1 day for integration and flaky test remediation.
- If scope risk: defer magic-link to v8.1 and ship OTP-first.

---

## 9) References
- Strategy: `docs/Auth_Strategy_vNext.md`
- Access Runbook: `website-integration/ArrowheadSolution/docs/cloudflare-access-runbook.md`
- Env Setup: `PRODUCTION_ENV_SETUP.md`
- Testing: `TESTING_STRATEGY.md`, `Sprint_2_Testing_Plan.md`
- AdminJS: `website-integration/ArrowheadSolution/server/admin/index.ts`

---

## 10) Post-Sprint Follow-Ups (Planned for v8.1+)
- MFA TOTP enrollment/verification UI polish + backup codes UX.
- Magic link parity (if not included in v8.0).
- Observability dashboard (auth funnels, abuse signals).
- WebAuthn/passkeys design note and spike.
