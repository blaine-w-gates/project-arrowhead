import os
import requests

GITHUB_API = "https://api.github.com"

class GitHubClient:
    def __init__(self, token: str | None = None):
        self.token = token or os.environ.get("GITHUB_SERVER_TOKEN", "")
        if not self.token:
            # Allow initialization without token; real call will fail, but tests monkeypatch this class.
            pass

    def _headers(self):
        return {
            "Accept": "application/vnd.github+json",
            "Authorization": f"Bearer {self.token}" if self.token else "",
            "X-GitHub-Api-Version": "2022-11-28",
        }

    def get_user(self):
        """Return (user_json, scopes_header) for the authenticated token."""
        resp = requests.get(f"{GITHUB_API}/user", headers=self._headers(), timeout=10)
        resp.raise_for_status()
        scopes = resp.headers.get("X-OAuth-Scopes", "")
        return resp.json(), scopes
