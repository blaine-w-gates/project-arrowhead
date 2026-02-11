# ADR-004: Auth Endpoint Naming and Cookie Contract

- Status: Accepted
- Date: 2025-10-11

## Context
Our `Auth_Strategy_vNext.md` defines a consistent set of endpoints and a session cookie model. Tests and client code must align to reduce ambiguity and flakiness.

## Decision
- Endpoints (both prod Functions and dev Express mirrors):
  - `POST /api/auth/request` – issue OTP and/or magic link
  - `POST /api/auth/verify` – verify OTP or magic link token and start a session
  - `POST /api/auth/logout` – clear the session cookie (and optionally revoke server-side session)
  - `GET  /api/me` – return the current user and entitlement info
- Cookie contract:
  - Name: `sb_session`
  - Type: JWT (HMAC) with `sub`(user id), `jti`, `iat`, `exp` (~7 days)
  - Flags: HttpOnly, Secure (prod), SameSite=Lax, Path=/
  - Rotation: rotate `jti` on successful verify/refresh
- `/api/me` response shape (minimum): `{ id, email, plan, status, isPro }`

## Consequences
- Client `/account` UI and E2E tests consume a stable contract.
- Mirrors across Functions and Express remain interchangeable for local vs production.
- Cookie is the authoritative auth signal in tests; UI copy is best-effort.
