# Backend Secrets Guide

This guide explains the required environment variables for the Flask admin API and how to configure them for local development and CI.

- SESSION_SECRET
- ADMIN_API_KEY
- GITHUB_SERVER_TOKEN

These are used by the backend modules in this repository:
- `app.py` reads `SESSION_SECRET` to initialize the Flask session secret.
- `backend/security.py` enforces the admin guard (`ADMIN_API_KEY`) and issues/verifies CSRF tokens.
- `backend/github_client.py` uses `GITHUB_SERVER_TOKEN` to authenticate to the GitHub API for the admin health check.

## 1) Variables

- SESSION_SECRET
  - Purpose: Secret key used by Flask to sign session cookies.
  - Where used: `app.py` (`app.secret_key`)
  - Recommendation: Long random string. Do not commit to version control.

- ADMIN_API_KEY
  - Purpose: Required in the `X-Admin-Key` header to access admin endpoints.
  - Where used: `backend/security.py` in `require_admin()`.
  - Recommendation: Random string; rotate if leaked.

- GITHUB_SERVER_TOKEN
  - Purpose: Server-side GitHub Personal Access Token (PAT) used by the admin GitHub health endpoint.
  - Where used: `backend/github_client.py` in `GitHubClient()`.
  - Scopes: Use least-privilege scopes (e.g., `read:user`) sufficient for reading `GET /user`.
  - Never expose to clients; only the server makes GitHub calls.

## 2) Local development setup

Ensure you are in your project-local virtual environment and export the variables in your shell session.

```bash
# macOS/Linux (zsh/bash)
source .venv/bin/activate

export SESSION_SECRET='change-me-long-random'
export ADMIN_API_KEY='change-me-admin-key'
export GITHUB_SERVER_TOKEN='ghp_xxx_least_privilege'

# Run the app
python main.py
# App will listen on http://localhost:5000
```

## 3) Verifying the admin endpoints

Issue a CSRF token (requires admin header):

```bash
curl -s -X POST \
  -H "X-Admin-Key: $ADMIN_API_KEY" \
  http://localhost:5000/api/admin/csrf
# => {"csrfToken":"..."}
```

Use the CSRF token to call the GitHub health endpoint (requires admin + CSRF):

```bash
CSRF_TOKEN=$(curl -s -X POST -H "X-Admin-Key: $ADMIN_API_KEY" \
  http://localhost:5000/api/admin/csrf | jq -r .csrfToken)

curl -s -H "X-Admin-Key: $ADMIN_API_KEY" \
  -H "X-CSRF-Token: $CSRF_TOKEN" \
  http://localhost:5000/api/admin/health/github | jq
# => { "ok": true, "login": "...", "id": 123, "scopes": "read:user" }
```

Notes:
- If `GITHUB_SERVER_TOKEN` is missing or invalid, the health endpoint may return `{ ok: false, error: ... }`.
- The unit tests do not require real secrets; they monkeypatch the GitHub client and set a test admin key.

## 4) CI considerations

- Unit tests (pytest) do not require `GITHUB_SERVER_TOKEN` because the tests mock GitHub calls.
- If you add integration checks that call GitHub in CI, store secrets as GitHub Actions Repository Secrets (Settings → Secrets and variables → Actions) and reference them via `${{ secrets.NAME }}`.
  - Example names: `SESSION_SECRET`, `ADMIN_API_KEY`, `GITHUB_SERVER_TOKEN`.

## 5) Security best practices

- Do not commit secrets to git. Prefer environment variables and GitHub Secrets.
- Use least privilege for the GitHub PAT (avoid write scopes unless required).
- Rotate credentials periodically and immediately upon suspected exposure.
- Limit secret visibility in your organization/repo to the minimum necessary.

## 6) Troubleshooting

- 403 from `/api/admin/csrf`: Missing or incorrect `X-Admin-Key`, or `ADMIN_API_KEY` not set on server.
- 403 from `/api/admin/health/github`:
  - Missing/invalid `X-Admin-Key` OR missing/invalid `X-CSRF-Token`.
  - CSRF token not issued in the same session; re-request via `/api/admin/csrf`.
- 500 from `/api/admin/health/github`: Likely GitHub auth or network error; verify `GITHUB_SERVER_TOKEN` and scopes.
